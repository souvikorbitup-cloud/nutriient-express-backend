import { QuizSession, Question } from "../models/quiz.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { goalTags, rootCauses } from "../data/data.js";
import { Chart } from "../models/chart.model.js";

function getAuthenticatedUserId(req) {
  try {
    // 1) Cookie token
    const cookieToken = req.cookies?.accessToken;

    // 2) Bearer token from Authorization header
    const headerAuth = req.headers?.authorization || "";
    const headerToken = headerAuth.startsWith("Bearer ")
      ? headerAuth.substring(7)
      : null;

    const token = cookieToken || headerToken;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decoded?._id || null;
  } catch {
    // Invalid / expired token -> unauthenticated
    return null;
  }
}

// Define hierarchy to prevent "Going Back"
const SECTION_RANK = {
  BASIC: 1,
  GOAL_SELECT: 2,
  GOALS: 3,
  LIFESTYLE: 4,
  COMPLETED: 5,
};

export const getSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let session = await QuizSession.findOne({ sessionId: id });

  // Create new if doesn't exist
  if (!session) {
    session = new QuizSession({ sessionId: id });
  }

  // If user is authenticated, associate session with user else null
  const authenticatedUserId = getAuthenticatedUserId(req);
  session.userId = authenticatedUserId || null;

  await session.save();

  return res.status(200).json(new ApiResponse(200, session, "Session Fetched"));
});

export const getQuestions = asyncHandler(async (req, res) => {
  const { section, goal } = req.query;
  let query = { section };

  if (section === "GOALS") {
    if (!goal) throw new ApiError(400, "Goal required for this section");
    query.goalType = goal;
  }

  const questions = await Question.find(query).sort({ stepOrder: 1 });

  // Ensure all relevant URLs are absolute before sending to client
  const transformedQuestions = questions.map((q) => {
    const qObj = q.toObject();

    // metadata.gifUrl
    if (qObj.metadata?.gifUrl) {
      qObj.metadata.gifUrl = makeAbsoluteUrl(qObj.metadata.gifUrl);
    }

    // options[].icon
    if (Array.isArray(qObj.options)) {
      qObj.options = qObj.options.map((opt) => {
        if (!opt) return opt;
        const updated = { ...opt };
        if (updated.icon) {
          updated.icon = makeAbsoluteUrl(updated.icon);
        }
        return updated;
      });
    }

    return qObj;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, transformedQuestions, "Question Fetched"));
});

export const syncProgress = asyncHandler(async (req, res) => {
  const { sessionId, section, step, data, selectedGoal } = req.body;

  let session = await QuizSession.findOne({ sessionId });
  if (!session) throw new ApiError(400, "Session expired");

  // If user is authenticated, associate session with user else null
  const authenticatedUserId = getAuthenticatedUserId(req);
  session.userId = authenticatedUserId || null;

  if (SECTION_RANK[section] < SECTION_RANK[session.currentSection]) {
    throw new ApiError(403, "Cannot return to previous section");
  }

  session.currentSection = section;
  session.currentStep = step;
  if (selectedGoal) session.selectedGoal = selectedGoal;

  // FIXED LOGIC HERE:
  if (data) {
    // Convert Map to Object if necessary, then merge
    const oldResponses = session.responses || {};
    session.responses = { ...oldResponses, ...data };

    // Crucial for "Mixed" types:
    session.markModified("responses");
  }

  if (section === "COMPLETED") session.isCompleted = true;

  await session.save();
  return res.status(200).json(new ApiResponse(200, session, "Sync Success"));
});

export const getUserCompletedSession = asyncHandler(async (req, res) => {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) throw new ApiError(200, "No authenticated user");

  const session = await QuizSession.findOne({
    userId: authenticatedUserId,
    isCompleted: true,
  }).sort({ updatedAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, session || null, "User completed session"));
});

export const deleteSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await QuizSession.findOne({ sessionId: id });
  if (!session) throw new ApiError(404, "Session not found");

  const authenticatedUserId = getAuthenticatedUserId(req);

  // Only allow deletion if session belongs to the authenticated user or is unassociated
  if (
    session.userId &&
    (!authenticatedUserId || session.userId.toString() !== authenticatedUserId)
  ) {
    throw new ApiError(403, "Not authorized to delete this session");
  }

  await QuizSession.deleteOne({ sessionId: id });
  return res.status(200).json(new ApiResponse(200, null, "Session deleted"));
});

export const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await QuizSession.findOne({
    sessionId: id,
    isCompleted: true,
  });
  if (!session) throw new ApiError(404, "Session not found");

  // Fetch user if associated
  const user = session.userId ? await User.findById(session.userId) : null;

  const responses = session.responses || {};
  const questionIds = Object.keys(responses);

  // Load questions to determine section and additional option metadata
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  const questionMap = {};
  questions.forEach((q) => (questionMap[q._id.toString()] = q));

  // Helpers
  const toNum = (v) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === "number") return v;
    // Decimal128 comes as object, convert to string then number
    if (v && v.toString) {
      const s = v["$numberDecimal"];

      return Number(s);
    }
    return Number(v);
  };

  // Accumulators
  let goalScore = 0;
  let lifestyleScore = 0;
  let bmiScore = 0;
  let activityScore = null;
  let tdeeValue = null;
  let goalTag = null;
  let healthAssessmentTag = null;
  let rootCause = null;
  const hizMap = {
    HIZ1: new Set(),
    HIZ2: new Set(),
    HIZ3: new Set(),
    HIZ4: new Set(),
    HIZ5: new Set(),
  };

  // Update BMI score based on body Type
  if (user && user.bodyType === "Fat But Fit") bmiScore = 10;
  else if (user && user.bodyType === "Very Fat") bmiScore = 20;
  else if (user && user.bodyType === "Skinny") bmiScore = 5;
  else if (user && user.bodyType === "Muscular/Lean") bmiScore = 0;

  // Update TDEE score based on body Type
  if (user && user.bodyType === "Fat But Fit") tdeeValue = 0.95;
  else if (user && user.bodyType === "Very Fat") tdeeValue = 1;
  else if (user && user.bodyType === "Skinny") tdeeValue = 1.05;
  else if (user && user.bodyType === "Muscular/Lean") tdeeValue = 1.05;

  // Update Goal Tag Based on Goal
  goalTag = goalTags[session.selectedGoal];

  // Update Root Causes Tag Based on Goal
  rootCause = rootCauses[session.selectedGoal];

  const processOption = (opt, section) => {
    if (!opt) return;
    // Score
    const score = toNum(opt.score);
    if (section === "GOALS") goalScore += score;
    if (section === "LIFESTYLE") lifestyleScore += score;

    // activity
    if (opt.activityScore !== undefined)
      activityScore = toNum(opt.activityScore);

    // HIZ
    if (opt.hizTag && opt.hizValue) {
      if (hizMap[opt.hizTag]) hizMap[opt.hizTag].add(opt.hizValue);
    }
  };

  // Iterate responses
  for (const qId of questionIds) {
    const resp = responses[qId];
    const question = questionMap[qId];
    const section = question ? question.section : null;

    // Normalize selected options array
    let selected = [];

    // Case 1: response is an object with 'value' being an array (MULTI)
    if (resp && Array.isArray(resp.value)) {
      selected = resp.value;
    } else if (
      resp &&
      resp.value &&
      typeof resp.value === "object" &&
      resp.value._id
    ) {
      // value is an object
      selected = [resp.value];
    } else if (resp && resp._id) {
      // response already stores selected option object
      selected = [resp];
    }

    // If still empty, skip
    if (!selected || selected.length === 0) continue;

    // For each selected option, process
    for (let opt of selected) {
      // If option is just an id or missing metadata, try to resolve against question.options
      if (
        opt &&
        !opt.score &&
        question &&
        question.options &&
        question.options.length
      ) {
        const resolved = question.options.find(
          (o) =>
            String(o._id) === String(opt._id) ||
            o.value === opt.value ||
            o.label === opt.label,
        );
        if (resolved) opt = resolved;
      }

      processOption(opt, section);
    }
  }

  // Health assessment score
  let healthAssessment =
    100 - (goalScore * 0.8 + lifestyleScore * 0.2 + bmiScore);
  healthAssessment = healthAssessment > 100 ? 100 : healthAssessment;

  // Update healthAssessment Tag based on healthAssessment value
  if (healthAssessment <= 40) healthAssessmentTag = "Critical Imbalance";
  else if (healthAssessment < 80 && healthAssessment > 40)
    healthAssessmentTag = "Moderate Imbalance";
  else if (healthAssessment <= 100 && healthAssessment > 80)
    healthAssessmentTag = "Minimum Imbalance";

  // BMR
  let bmr = null;
  const weightKg = user?.weight;
  const gender = (user?.gender || "").toLowerCase();
  if (weightKg && (gender === "male" || gender === "female")) {
    if (gender === "male") bmr = weightKg * 22;
    else bmr = weightKg * 20;
    bmr = Math.round(bmr);
  }

  // Maintenance Calories = BMR x activityScore x TDEE
  let maintenanceCalories = null;
  if (bmr && activityScore && tdeeValue) {
    maintenanceCalories = Math.round(bmr * activityScore * tdeeValue);
  }

  // Ideal target
  let idealTarget = null;
  const roundedMaintenance = Math.round(maintenanceCalories / 100) * 100;
  const goal = session.selectedGoal || null;
  if (roundedMaintenance) {
    if ((goal || "").toLowerCase() === "weight loss") {
      idealTarget = {
        low: roundedMaintenance - 600,
        high: roundedMaintenance - 500,
        unit: "kcal/day",
      };
    } else {
      idealTarget = {
        low: roundedMaintenance - 100,
        high: roundedMaintenance,
        unit: "kcal/day",
      };
    }
  }

  // Maintenance Calories for Chart [1600 - 3600]
  let chartVal = roundedMaintenance;
  if (roundedMaintenance && roundedMaintenance < 1600) {
    chartVal = 1600;
  } else if (roundedMaintenance && roundedMaintenance > 3600) {
    chartVal = 3600;
  }
  const chartMaintenanceCalories = await Chart.findOne({ value: chartVal });
  chartMaintenanceCalories.image = makeAbsoluteUrl(chartMaintenanceCalories.image)


  // HIZ values - convert sets to strings
  const hiz = {};
  for (const key of Object.keys(hizMap)) {
    const arr = Array.from(hizMap[key]);
    hiz[key] = arr.length ? arr.join(", ") : null;
  }

  const images = [
    "/test/cravings.svg",
    "/test/digestive.svg",
    "/test/fat.svg",
    "/test/low_activity.svg",
    "/test/doc.svg",
  ];
  const hizValues = [];
  for (const key in hiz) {
    hizValues.push({
      tag: key,
      value: hiz[key],
      image: images[key.at(-1) - 1],
    });
  }

  const report = {
    userName: user?.fullName || null,
    goal: session.selectedGoal || null,
    healthAssessment,
    healthAssessmentTag,
    goalTag,
    hizValues,
    bmr,
    maintenanceCalories,
    chartMaintenanceCalories,
    idealTarget,
    rootCause,
    sessionId: session.sessionId,
  };

  return res.status(200).json(new ApiResponse(200, report, "User Report"));
});

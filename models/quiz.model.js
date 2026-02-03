import { Schema, model } from "mongoose";

const QuizSessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Optional user association
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Progress Tracking
    currentSection: {
      type: String,
      enum: ["BASIC", "GOAL_SELECT", "GOALS", "LIFESTYLE", "COMPLETED"],
      default: "BASIC",
    },

    currentStep: {
      type: Number,
      default: 0,
      min: 0,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    // User Choices
    selectedGoal: {
      type: String,
      default: null,
      index: true,
    },

    responses: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

// 24-Hour Expiration Logic (Only deletes if NOT completed)
QuizSessionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { isCompleted: false },
  },
);

export const QuizSession = model("QuizSession", QuizSessionSchema);

const QuestionSchema = new Schema({
  section: {
    type: String,
    enum: ["BASIC", "GOAL_SELECT", "GOALS", "LIFESTYLE"],
    required: true,
  },
  goalType: { type: String, default: "NONE" }, // Only used if section is 'GOALS'
  stepOrder: Number,
  type: {
    type: String,
    enum: ["INPUT", "CHOICE", "MULTI", "GIF", "OTP"],
    required: true,
  },

  // UI Content
  questionText: String,
  description: String,
  metadata: {
    gifUrl: String,
    duration: Number, // Seconds
    placeholder: String,
    validationType: String, // 'number', 'text', 'phone', 'email'
  },

  // Logic & Scoring
  options: [
    {
      label: String,
      icon: String,
      value: String, // Internal value
      score: Schema.Types.Decimal128,
      hizTag: String, // 'HIZ1', 'HIZ2', etc.
      hizValue: String,
      proteinTrigger: Boolean, // True = Plant Protein
      bmiScore: Schema.Types.Decimal128,
      tdeeScore: Schema.Types.Decimal128,
      activityScore: Schema.Types.Decimal128,
    },
  ],
});

export const Question = model("Question", QuestionSchema);

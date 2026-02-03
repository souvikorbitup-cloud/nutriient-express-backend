import { Contact } from "../models/contact.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";

export const createContact = asyncHandler(async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body;

  if (!fullName || !email || !phone || !subject || !message) {
    throw new ApiError(400, "All fields are required");
  }

  const contact = await Contact.create({
    fullName: fullName.trim(),
    email,
    phone,
    subject: subject.trim(),
    message: message.trim(),
  });

  /* =========================
     Send Thank You Email
  ========================= */
  const quizLink = `${process.env.FRONTEND_URL}/quiz`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Thank you for contacting us, ${fullName}!</h2>
      <p>We’ve received your message and our team will get back to you shortly.</p>

      <p>
        Meanwhile, we'd love for you to take our quick quiz to get personalized recommendations:
      </p>

      <a 
        href="${quizLink}" 
        style="
          display: inline-block;
          padding: 10px 18px;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 10px;
        "
      >
        Take the Quiz
      </a>

      <p style="margin-top: 20px;">
        Best regards,<br />
        <strong>Your Team</strong>
      </p>
    </div>
  `;

  // Do NOT block response if email fails
  sendEmail(email, "Thank you for contacting us!", emailHtml).catch((err) =>
    console.error("Email send failed:", err),
  );

  return res
    .status(201)
    .json(new ApiResponse(201, contact, "Message sent successfully"));
});

export const getAllContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, contacts, "Contacts fetched successfully"));
});

export const getContactById = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const contact = await Contact.findById(contactId);

  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, contact, "Contact fetched successfully"));
});

export const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  await Contact.deleteOne({ _id: contactId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Contact deleted successfully"));
});

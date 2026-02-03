import { createTransport } from "nodemailer";

const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Nutriient" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

export default sendEmail;

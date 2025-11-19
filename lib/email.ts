import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.MANDRILL_SMTP_HOST,
  port: Number(process.env.MANDRILL_SMTP_PORT),
  secure: false, // Mandrill uses STARTTLS on port 587
  auth: {
    user: process.env.MANDRILL_SMTP_USER,
    pass: process.env.MANDRILL_SMTP_PASS,
  },
});

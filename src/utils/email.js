const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"RCET Lab System" <${env.smtp.user}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
  }
};

const emailTemplates = {
  verifyEmail: (name, verifyUrl) => ({
    subject: 'Verify Your Email - RCET Lab System',
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for registering at RCET Lab System.</p>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
      <p>If you did not register, please ignore this email.</p>
    `,
  }),

  approvalSuccess: (name, role) => ({
    subject: 'Account Approved - RCET Lab System',
    html: `
      <h2>Hello ${name},</h2>
      <p>Your account has been approved by an administrator.</p>
      <p>Your assigned role: <strong>${role}</strong></p>
      <p>You can now log in and access the system.</p>
    `,
  }),

  approvalRejected: (name, reason) => ({
    subject: 'Account Rejected - RCET Lab System',
    html: `
      <h2>Hello ${name},</h2>
      <p>Unfortunately, your account registration has been rejected.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>If you believe this is an error, please contact the administrator.</p>
    `,
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'Reset Password - RCET Lab System',
    html: `
      <h2>Hello ${name},</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  }),
};

module.exports = { sendMail, emailTemplates };

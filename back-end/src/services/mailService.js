const nodemailer = require('nodemailer');

const parseSecureFlag = (value) => String(value).toLowerCase() === 'true';
let transporter;

const createTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error('SMTP configuration is missing (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: parseSecureFlag(process.env.SMTP_SECURE),
        auth: {
            user,
            pass,
        },
    });

    return transporter;
};

exports.sendNewPasswordEmail = async ({ to, fullName, newPassword }) => {
    if (!to || !newPassword) {
        throw new Error('Email recipient and new password are required');
    }

    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const text = [
        `Hello ${fullName || 'User'},`,
        '',
        'We received a request to reset your password.',
        `Your new temporary password is: ${newPassword}`,
        '',
        'Please log in and change it immediately for security.',
        '',
        'If you did not request this, contact support right away.',
    ].join('\n');

    await transporter.sendMail({
        from,
        to,
        subject: 'Your new password',
        text,
    });
};

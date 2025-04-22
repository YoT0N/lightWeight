const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    async sendPasswordResetEmail(to, resetUrl) {
        const mailOptions = {
            from:
                process.env.EMAIL_FROM ||
                '"LightWeight App" <no-reply@lightweightapp.com>',
            to,
            subject: 'Відновлення паролю',
            html: `
                <h1>Відновлення паролю</h1>
                <p>Ви отримали цей лист, тому що ви (або хтось інший) запросили відновлення паролю для вашого облікового запису.</p>
                <p>Будь ласка, натисніть на посилання нижче або скопіюйте його в адресний рядок браузера для продовження процесу:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>Якщо ви не запитували відновлення паролю, проігноруйте цей лист, і ваш пароль залишиться незмінним.</p>
                <p>З повагою,<br>Команда LightWeight</p>
            `,
        };

        return await this.transporter.sendMail(mailOptions);
    }
}

module.exports = new EmailService();

import axios from "axios";

const MANDRILL_URL = 'https://mandrillapp.com/api/1.0/messages/send';

export async function sendVerificationEmail(toEmail: string, code: string): Promise<void> {
    await axios.post(MANDRILL_URL, {
        key: process.env.MAILCHIMP_API_KEY,
        message: {
            to: [{ email: toEmail, type: "to"}],
            from_email: "no-reply@openworldlinkservice.com",
            from_name: "",
            subject: "Код подтверждения: ",
            text: `Ваш код подтверждения: ${code}`
        }
    });
}
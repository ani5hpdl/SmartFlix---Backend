const nodemailer = require("nodemailer");

const sendEmail = async(to,subject,html) => {
    try{
        //Creating Transporter
        const transporter = nodemailer.createTransport({
            service : "gmail",
            auth : {
                user : process.env.EMAIL_USER,
                pass : process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from : process.env.EMAIL_USER,
            to: to,
            subject : subject,
            html: html
        });

        console.log("Email Sent Sucessfully");
        return true;
    }catch(error){
        console.log("Email error: ",error.message);
        return false;
    }
}

const verificationEmailTemplate = ( name, verificationLink ) => {
    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding:40px 10px;">
                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:30px;">
                        <tr>
                            <td align="center">
                                <h2 style="color:#333333; margin-bottom:20px;">
                                    Verify Your Email Address
                                </h2>
                            </td>
                        </tr>

                        <tr>
                            <td style="color:#555555; font-size:16px; line-height:24px; text-align:center;">
                                Hello ${name || "there"},<br><br>
                                Thank you for registering. Please confirm your email address by clicking the button below.
                            </td>
                        </tr>

                        <tr>
                            <td align="center" style="padding:30px 0;">
                                <a href="${verificationLink}"
                                   style="
                                       background-color:#007BFF;
                                       color:#ffffff;
                                       text-decoration:none;
                                       padding:14px 30px;
                                       border-radius:6px;
                                       font-size:16px;
                                       font-weight:bold;
                                       display:inline-block;
                                   ">
                                    Verify Email
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="color:#888888; font-size:13px; line-height:20px; text-align:center;">
                                If you did not create an account, you can safely ignore this email.
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-top:30px; text-align:center; font-size:12px; color:#aaaaaa;">
                                © ${new Date().getFullYear()} Your App Name. All rights reserved.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

module.exports ={ sendEmail,verificationEmailTemplate}
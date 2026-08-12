import nodemailer from 'nodemailer';

async function test() {
  console.log("Starting email test...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log("Created test account:", testAccount.user);
    
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Test" <test@example.com>',
      to: "recipient@example.com",
      subject: "Test email",
      text: "This is a test.",
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

test();

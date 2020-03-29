const fs = require('fs');
const ip = require("ip");
const emailTransporter = require('../email-transporter.js');
const { encriptPassword, getSaltFromAccount } = require("./account")

const htmlTemplateEmail = fs.readFileSync('./resources/emails/template.html', 'utf-8')
  
exports.sendWelcomeEmail = function (req, res, emailTo, username, password) {
    //Primero obtenemos el archivo html del tipo de email a enviar y ponemos los parametros
    let htmlContentEmail = fs.readFileSync('./resources/emails/welcome.html', 'utf-8')
    htmlContentEmail = htmlContentEmail.replace('VAR_USERNAME', username)
    htmlContentEmail = htmlContentEmail.replace('VAR_PASSWORD', password)

    //Despues obtenemos el archivo html del template y reemplazamos la variable por el contenido deseado
    htmlContentEmail = htmlTemplateEmail.replace('VAR_TIPO_EMAIL_ENVIAR', htmlContentEmail)

    var mailOptions = {
        from: process.env.EMAIL,
        to: emailTo,
        subject: '🗡 Bienvenido a Argentum Online Libre (Alkon) ⚔️',
        html: htmlContentEmail
    };
    
    emailTransporter.getGeneralPool().sendMail(mailOptions, function(error, info){
        if (error) {
			console.error('\x1b[31m%s\x1b[0m', "ERROR - sendWelcomeEmail error: " + error)
            return res.status(500).send('No se pudo enviar el email de bienvenida' + error)
        } else {
            console.info("Se envio un email de bienvenida a: " + emailTo)
            return res.status(200).send('Email welcome sent: ' + info.response)
        }
    }); 
};

exports.sendLoginEmail = function (req, res, emailTo, date) {
    //Primero obtenemos el archivo html del tipo de email a enviar y ponemos los parametros
    let htmlContentEmail = fs.readFileSync('./resources/emails/loginAccount.html', 'utf-8')
    
    //TODO: MANDAR IP??
    htmlContentEmail = htmlContentEmail.replace('VAR_IP', '')

    var yyyymmdd = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + " ";
    const hourAndMinutes = (date.getHours()<10?'0':'') + date.getHours() + ":" + (date.getMinutes()<10?'0':'') + date.getMinutes()

    const formattedDate = yyyymmdd + hourAndMinutes

    htmlContentEmail = htmlContentEmail.replace('VAR_DATE', formattedDate)

    //Despues obtenemos el archivo html del template y reemplazamos la variable por el contenido deseado
    htmlContentEmail = htmlTemplateEmail.replace('VAR_TIPO_EMAIL_ENVIAR', htmlContentEmail)

    var mailOptions = {
        from: process.env.EMAIL,
        to: emailTo,
        subject: '🛡 Nuevo inicio de sesión en Argentum Online Libre',
        html: htmlContentEmail
    };
    
    emailTransporter.getGeneralPool().sendMail(mailOptions, function(error, info){
        if (error) {
			console.error('\x1b[31m%s\x1b[0m', "ERROR - sendLoginEmail error: " + error)
            return res.status(500).send('No se pudo enviar el email de login' + error)
        } else {
            console.info("Se envio un email de login a: " + emailTo)
            return res.status(200).send('Email login sent: ' + info.response)
        }
    }); 
};

exports.sendResetAccountPassword = async function (req, res, email, password) {
    //Primero obtenemos el archivo html del tipo de email a enviar y ponemos los parametros
    let htmlContentEmail = fs.readFileSync('./resources/emails/resetPassword.html', 'utf-8')
    
    //Obtenemos la salt del personaje, encriptamos la password y mandamos el email
    const salt = getSaltFromAccount(email)
    const encriptedPassword = await encriptPassword(password, salt);

    // Hardcodeo la ip por que amazon no funciona bien con esto, asi que hasta que cambiemos de host arreglo esto.
	// const linkResetPasswordEndpoint = `http://${ip.address()}:1337/api/v1/accounts/resetPassword/${email}/${encriptedPassword}`
	const linkResetPasswordEndpoint = `http://18.231.37.189:1337/api/v1/accounts/resetPassword/${email}/${encriptedPassword}`

    htmlContentEmail = htmlContentEmail.replace('VAR_LINK_ENDPOINT_RESET_PASSWORD', linkResetPasswordEndpoint)

    //Despues obtenemos el archivo html del template y reemplazamos la variable por el contenido deseado
    htmlContentEmail = htmlTemplateEmail.replace('VAR_TIPO_EMAIL_ENVIAR', htmlContentEmail)

    var mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: '🔑 Reset Password Cuenta Argentum Online Libre (Alkon) 🔐',
        html: htmlContentEmail
    };
    
    emailTransporter.getGeneralPool().sendMail(mailOptions, function(error, info){
        if (error) {
			console.error('\x1b[31m%s\x1b[0m', "ERROR - sendResetAccountPassword error: " + error)
            return res.status(500).send({error: 'No se pudo enviar el email de reset password'})
        } else {
            console.info("Se envio un email de reset password a: " + email)
			return res.status(200).send('Email reset password sent: ' + info.response)
        }
    }); 
};

exports.sendNewsletterEmail = async function (req, res, allEmails, emailSubject, emailContent) {
    //Primero obtenemos el archivo html del tipo de email a enviar y ponemos los parametros
    let htmlContentEmail = fs.readFileSync('./resources/emails/newsletter.html', 'utf-8')

    htmlContentEmail = htmlContentEmail.replace('VAR_CONTENT', emailContent)

    //Despues obtenemos el archivo html del template y reemplazamos la variable por el contenido deseado
    htmlContentEmail = htmlTemplateEmail.replace('VAR_TIPO_EMAIL_ENVIAR', htmlContentEmail)

    const emailsStatus = {
        emailsSent: [],
        emailsFailed: []        
    };

    let blacklistEmails = fs.readFileSync('./blacklist-emails.json', 'utf-8')
    blacklistEmails = JSON.parse(blacklistEmails);

    console.log(`Hay que enviar ${allEmails.length} emails`)

    let mailOptions = {
        from: process.env.EMAIL_NEWSLETTER,
        subject: `⛏ ${emailSubject}`,
        html: htmlContentEmail
    };

    for (const [key, emailValue] of Object.entries(allEmails)) {
        // Si NO esta email esta en la blacklist trabajamos.
        if (!blacklistEmails.includes(emailValue.INIT_USERNAME)) {
            mailOptions.to = "argentumonline@riseup.net";

            console.info("Se esta enviando un email de newsletter a: " + emailValue.INIT_USERNAME)

            const info = await emailTransporter.getNewsletterPool().sendMail(mailOptions).catch(console.error);
    
            if (info && info.response.includes("250")) {
                console.info("Se envio un email de newsletter a: " + emailValue.INIT_USERNAME)
                emailsStatus.emailsSent.push(emailValue.INIT_USERNAME)
            } else {
                console.error('\x1b[31m%s\x1b[0m', "ERROR - sendNewsletterEmail error: " + emailValue.INIT_USERNAME)
                emailsStatus.emailsFailed.push(emailValue.INIT_USERNAME)
            }
        }

        // Si es el ultimo email...
        if (allEmails.length - 1 === parseInt(key)) {
            console.info("Guardando emails que no se pueden enviar en blacklist-emails.json");
            fs.writeFileSync(`./blacklist-emails.json`, JSON.stringify(emailsStatus.emailsFailed, null, 4));
            
            console.info("Se completo el envio de Newsletter a todos los usuarios");
        }
    };
    
    return res.status(200).send("Se inicio el envio del newsletter email con exito")
};
'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const Stripe = require('stripe');

module.exports = {
    async complete(ctx) {
        const boutiqueInfo = await strapi.services.boutique.find(ctx.query);
        console.log("general variables", boutiqueInfo)

        // await strapi.plugins['email'].services.email.send({
        //     to: 'saraltusa@gmail.com',
        //     from: 'pasteldelaserre@gmail.com',
        //     replyTo: 'pasteldelaserre@gmail.com',
        //     subject: 'Use strapi email provider successfully',
        //     text: 'Hello world!',
        //     html: 'Hello world!',
        // });

        const emailTemplate = {
            subject: 'Welcome',
            text: `Welcome on mywebsite.fr!
              Your account is now linked with:`,
            html: `<h1>Welcome on mywebsite.fr!</h1>
              <p>Your account is now linked with`,
        };
        /*
                await strapi.plugins.email.services.email.sendTemplatedEmail(
                    {
                        to: 'saraltusa@gmail.com',
                        // from: 'pasteldelaserre@gmail.com'
                    },
                    emailTemplate,
                    {
                        // user: _.pick(user, ['username', 'email', 'firstname', 'lastname']),
                    }
                );*/

        const stripe = new Stripe("sk_test_51Hgd7fLNYvKIoqTPkIH2mNKdKejM8RtB5v9IibydLaeLPbHau13RdFijqeUWdAZHzgHXASeLx8nModQhACjAxTvz00IqWuxTcf"); // get this id from database
        //validate products by id
        const { products, customer, payment } = ctx.request.body;
        const dbProducts = await strapi.services.products.find(ctx.query);
        let customerValidation = false;
        let productValidation = false;

        const customerTrim = {
            name: customer.name ? customer.name.replace(/\s/g, '') : null,
            email: customer.email ? customer.email.replace(/\s/g, '') : null,
            phone: customer.phone ? customer.phone.replace(/\s/g, '') : null,
            address: customer.address ? customer.address.replace(/\s/g, '') : null
        }

        //check request fields: https://stackoverflow.com/questions/38616612/javascript-elegant-way-to-check-object-has-required-properties
        //customer validation________________________________________

        const schema = {
            name: value => value != null && value != '',
            email: value => /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value),
            phone: value => value != null && value != '',
            address: value => value != null && value != '',
        };

        const validateFields = (object, schema) => Object
            .keys(schema)
            .filter(key => !schema[key](object[key]))
            .map(key => new Error(`${key} is invalid.`));


        const errors = validateFields(customer, schema);

        if (errors.length > 0) {
            for (const { message } of errors) {
                console.log(message);
            }
        } else {
            console.log('info is valid');
            customerValidation = true;
        }

        //product validation________________________________________

        if (products != null && products != '' && products.length > 0) {
            //add validation per product
            productValidation = true;
        }


        //==========================================================================================================
        // if (customerValidation && productValidation) {
        if (customerValidation && productValidation) {

            //get products by id 

            const checkoutProductDetail = await Promise.all(products.map(async p => {
                return new Promise(async (resolve, reject) => {
                    try {
                        const product = await strapi.query('products').findOne({ id: p.product_id });//evaluate if product is available
                        product.attributes = p.attributes;
                        product.quantity = p.quantity;
                        product.total_to_pay = product.price * p.quantity;
                        resolve(product)
                    } catch (error) {
                        reject(err)
                    }
                })

            }));

            //calculate total amount by product quantity: https://stackoverflow.com/questions/54023864/how-can-i-accumulate-values-in-a-json-array-by-the-value-of-a-property

            let orderAmount = parseFloat(checkoutProductDetail.map(p => p.total_to_pay).reduce((acumulator, currentvalue) => acumulator + currentvalue).toFixed(2));

            //convert products in text: TODO: save this on new table
            const productDetailText = checkoutProductDetail.map(p => {
                return `- x${p.quantity} ${p.name_fr} (variation: ${p.attributes}) / price: € ${p.total_to_pay} <br>`
            }).toString().replace(/,/g, ' ');


            const orderObject = {
                product_detail: `**Products**: <br> ${productDetailText}`,
                total: orderAmount,
                client_address: customer.address,
                client_email: customer.email,
                client_name: customer.name,
                client_phone: customer.phone,
            }

            //23.76
            //100

            try {

                //save client info in database

                const customerCreated = await strapi.services.customer.create(customer);

                //create row at orders 

                const orderCreated = await strapi.services.orders.create(orderObject);

                //get currency

                let orderId = orderCreated.id;;
                let { currency } = await strapi.services.boutique.find(ctx.query);
                let order_status = orderCreated.order_status;

                console.log("::::::::::::::::::order::::::::::::::", orderCreated);
                //proccess payment

                let amountParse = parseInt(orderAmount.toString().includes(".") ? orderAmount.toString().replace('.', "") : orderAmount.toString() + "00");

                const paymentResponse = await stripe.paymentIntents.create({
                    amount: amountParse,
                    currency: currency,
                    description: "Order id: " + orderId,
                    payment_method: payment.id_card,
                    confirm: true
                })
                console.log("orderAm", orderAmount)
                console.log("parsed", amountParse)
                console.log(paymentResponse)

                if (paymentResponse.status == "succeeded") { //payment success
                    //update order to APPROVED
                    console.log("succeded");

                    let orderUpdate = {
                        payment_status: "SUCCESS",
                        payment_id: paymentResponse.id,
                        order_status: 'APPROVED'
                    }

                    let orderUpdated = await strapi.services.orders.update({ id: orderId }, orderUpdate);

                    //send response to client with sucessfull

                    let orderResponse = {
                        "code": 200,
                        "order_id": orderId,
                        "order_status": orderUpdated.order_status,
                        "message": "Payment successfully, check your email inbox to track your order"
                    }

                    //send response

                    ctx.send(orderResponse)

                    //notify to client and admin

                } else { //payment rejected
                    //update order to PAYMENT REJECTED

                    let orderUpdate = {
                        payment_status: 'PENDING',
                        payment_id: paymentResponse.id,
                        order_status: 'REJECTED'
                    }

                    let orderUpdated = await strapi.services.orders.update({ id: orderId }, orderUpdate);
                    //send response to cliente with problems and message

                    let orderResponse = {
                        "code": 200,
                        "order_id": orderId,
                        "order_status": orderUpdated.order_status,
                        "message": "Payment successfully, check your email inbox to track your order"
                    }

                    ctx.send(orderResponse)
                }

            } catch (err) {

                console.error(err)

                let orderResponseErr = {
                    "code": 400,
                    "order_status": "REJECTED",
                    "message": { message: "There was a problem with you order, please check and try again: " + err }
                }

                ctx.send(orderResponseErr)

            }
        } else {

            let orderResponse2 = {
                "code": 500,
                "order_status": "REJECTED",
                "message": "Ops! There was a problem, try again: " + errors.map(e => e.message).toString()
            }

            ctx.send(orderResponse2)
        }
    },
    async updatepayment(ctx) {

        //update order status and payment status
        const { order_id, payment } = ctx.request.body;

        let orderUpdate = {
            payment_status: payment.status,
            payment_id: payment.id,
            order_status: 'APPROVED'
        }

        let orderUpdated = await strapi.services.orders.update({ id: order_id }, orderUpdate);

        console.log(orderUpdated)

        //send email to client 
        //send email to store owner
        //send response

        ctx.send("asdasd")
        if (ctx.request.body.payment.status == "SUCCESS") {
            let orderUpdateResponse = {
                "code": 200,
                "order_id": orderUpdated.id,
                "order_status": orderUpdated.status,
                "message": "Payment successfully, check your email inbox to track your order"
            }
            ctx.send(orderUpdateResponse)
        } else {
            let orderUpdateResponse = {
                "code": 400,
                "order_id": 1,
                "order_status": "REJECTED",
                "message": "There was a problem with you payment, please check and try again"
            }
            ctx.send(orderUpdateResponse)
        }
    }
};


// const orderObject = {
//     product_detail: `Products:  - x1 Complex product name - M / price: 12.00 `,
//     total: orderAmount,
//     order_status: ''
//     payment_status: 'Pending'
//     payment_id: 
//     order_comments:
//     shipping_code:
//     shipping_provider:
//     shipping_url:
//     client_address: customer.address,
//     client_email: customer.email,
//     client_name: customer.name,
//     client_phone: customer.name,
// }
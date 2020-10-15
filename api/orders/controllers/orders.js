'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async complete(ctx) {
        let orderResponse = {
            "code": 400,
            "order_id": 1,
            "order_amount_currency": "eur",
            "order_amount": 1.21,
            "order_status": "CREATED",
            "message": "Order created successfully"
        }
        let orderResponse2 = {
            "code": 500,
            "order_status": "REJECTED",
            "message": "Ops! There was a problem, try again"
        }
        ctx.send(orderResponse)
    },
    async updatepayment(ctx) {
        ctx.send("asdasd")
        if (ctx.request.body.payment.status == "SUCCESS") {
            let orderUpdateResponse = {
                "code": 400,
                "order_id": 1,
                "order_status": "APPROVED",
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

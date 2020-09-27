'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    build: async ctx => {
        let product = await strapi.services.products.findOne(ctx.params)
        if (!product.options.length) return

        console.log("playing");
        const cartesian = (sets) => {
            return sets.reduce((acc, curr) => {
                return acc.map(x => {
                    return curr.map(y => {
                        return x.concat([y])
                    })
                }).flat()
            }, [[]])
        }

        //capitalize function
        const capitalize = (s) => {
            if (typeof s !== 'string') return ''
            return s.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
        }

        const { options } = product

        //map functions return an array of array [["sm", "md", "lg"], ["red", "green", "blue"]]
        //cartesian function reduces and combines arrays and returns mixed variations
        //[ [ { size: 'sm' }, { color: 'blue' } ], [ { size: 'sm' }, { color: 'red' } ], [ { size: 'sm' }, { color: 'green' } ], [ { size: 'md' }, { color: 'blue' } ], [ { size: 'md' }, { color: 'red' } ], [ { size: 'md' }, { color: 'green' } ], [ { size: 'lg' }, { color: 'blue' } ], [ { size: 'lg' }, { color: 'red' } ], [ { size: 'lg' }, { color: 'green' } ]]
        const variations = cartesian(_.map(options, ({ name, options }) => _.map(options, ({ value }) => ({ [name]: value }))))

        //iterate through all variations creating the records
        const records = _.map(variations, variation => {
            let name = variation.reduce((acc, current) => acc + " " + Object.values(current)[0], product.name)
            let slug = variation.reduce((acc, current) => acc + "-" + Object.values(current)[0].replace(/ /g, '-'), product.slug).toLowerCase()

            return {
                product: product._id,
                name: capitalize(name),
                slug: slug,
                price: product.price,
                description: product.description,
                stock: product.stock,
                ...('sale' in product && { sale: product.sale }),
            }
        })

        try {
            const createAllRecords = await Promise.all(records.map(record =>
                new Promise(async (resolve, reject) => {
                    try {
                        const created = await strapi.services.variation.create(record)
                        resolve(created)
                    } catch (err) {
                        reject(err)
                    }
                })
            ))
            ctx.send(createAllRecords)
        } catch (err) {
            console.error(err)
        }


    }
};

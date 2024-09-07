/**
 * @param {number} current
 * @param {number} total
 * @returns {string}
 * @description
 * This function takes in two numbers, current and total, and returns a string representation of the percentage of current in total.
 * The percentage is rounded to two decimal places.
 * @example
 * printPercentage(1, 10) // '10.00%'
 * printPercentage(3, 10) // '30.00%'
 * printPercentage(5, 10) // '50.00%'
 * printPercentage(7, 10) // '70.00%'
 * printPercentage(9, 10) // '90.00%'
 */

module.exports = (current, total) => ((current / total) * 100).toFixed(2) + '%'


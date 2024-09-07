/**
 * Converts bytes to megabytes
 * @param {number} bytes - The number of bytes to convert
 * @returns {number} - The number of megabytes
 * @description
 * This function takes in a number of bytes and returns the number of megabytes.
 * The number is rounded to two decimal places.
 * @example
 * bytestoMB(1048576) // 1.00
 * bytestoMB(10485760) // 10.00
 * bytestoMB(104857600) // 100.00
 * bytestoMB(1048576000) // 1000.00
 */
module.exports = (bytes) => (bytes / 1024 / 1024).toFixed(2)
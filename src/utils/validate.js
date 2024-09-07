module.exports = (...args) => {
    const errors = args.filter(arg => !arg)
    if (errors.length) {
        throw new Error(`Missing required arguments: ${errors.join(', ')}`)
    }
}
const { getAuth } = require('node-sp-auth')
const fetch = require('node-fetch')

const { createReadStream, statSync } = require('fs');
const { basename } = require('path');

const { 
    printPercentage,
    bytesToMB,
    validate,
    uuid
} = require('../utils')

/**
 * SharepointUpload
 * 
 * @param {String} url - The URL of the Sharepoint folder where the file will be uploaded
 * @param {Object} credentials - The credentials to authenticate with Sharepoint
 * @param {Boolean} options.verbose - Whether to log the progress of the upload
 * @param {Object} options.logger - The logger to use
 * 
 * @returns {SharepointUpload}
 * 
 * @example
 * 
 * const sharepointUploader = new SharepointUpload({
 *   url: 'https://mycompany.sharepoint.com/sites/mysite/Shared Documents/MyFolder/MySubFolder',
 *   credentials: {
 *      username: 'my username',
 *      password: 'my password'
 *  },
 *  options: {
 *    verbose: true,
 *    logger: console
 *  }
 * 
 */
class SharepointUpload {
    constructor({ 
        url,
        credentials,
        options: { verbose, logger } = {}
    }) {
        validate(url, credentials)

        const { origin, pathname } = new URL(url)
        const [siteSlug, site, ...folder] = pathname.split('/').filter(Boolean)
        const { href } = new URL(`/${siteSlug}/${site}`, origin)

        this.site = site
        this.siteSlug = siteSlug

        this.folder = `/${folder.join('/')}`
        this.url = href
        this.pathname = pathname

        this.credentials = credentials

        this.verbose = verbose
        this.logger = logger || console    
        this.loggerSupplied = !!logger
    }

    /**
     * Uploads a file to Sharepoint
     * 
     * @param {String} filePath - The path to the file to upload
     * @param {Object} options.fileName - The name to use for the file in Sharepoint
     * @param {Object} options.folder - The folder in Sharepoint where the file will be uploaded
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * 
     * await sharepointUploader.upload('path/to/file.txt', { fileName: 'new-file-name.txt' })
     * 
     * @description
     * This method uploads a file to Sharepoint.
     * The file will be uploaded to the folder specified in the URL passed to the constructor.
     * If no fileName is provided, the file will be uploaded with the same name as the file being uploaded.
     * 
     * If the file already exists in Sharepoint, it will be overwritten.
     * 
     */
    async upload(filePath, { fileName, folder } = {}) {
        const chunkSize = 1024 * 1024 * 48
        const stream = createReadStream(filePath, { highWaterMark: chunkSize})

        const auth = await this.#getAuth()
        this.formDigest = await this.#getFormDigest(auth)

        const baseHeaders = {
            ...auth,
            'X-RequestDigest': this.formDigest,
        }

        const fileNameToUse = fileName || basename(filePath)
        this.setFolder(folder)
        
        await this.#createFile(fileNameToUse, baseHeaders)

        const baseUrl = `${this.url}/_api/web/getfilebyserverrelativeurl('${this.pathname}/${fileNameToUse}')`
        try {
            const id = uuid()

            const { size } = statSync(filePath)
            const sizeInMB = bytesToMB(size)
            let offset = 0

            for await (const chunk of stream) {
                const url = `${baseUrl}/${offset ? 'continueupload' : 'startupload'}(uploadId=guid'${id}'${offset ? `,fileOffset=${offset}` : ''})`
                const chunkResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        ...baseHeaders,
                        'Content-Length': chunk.length,
                    },
                    body: chunk
                })

                if (!chunkResponse.ok) {
                    throw new Error('It was not possible to upload the file')
                }

                offset += chunk.length
                this.verbose && this.logger.log(`Uploaded ${bytesToMB(offset)} of ${sizeInMB} MB (${printPercentage(offset, size)})`)
            }

            const url = `${baseUrl}/finishupload(uploadId=guid'${id}',fileOffset=${size})`
            const finishUploadResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    ...baseHeaders,
                    'Content-Length': 0
                }
            })

            if (!finishUploadResponse.ok) {
                throw new Error('It was not possible to finish the upload')
            }

            this.loggerSupplied && this.logger.log(`File ${fileNameToUse} uploaded`)
        }
        catch (error) {
            throw new Error('It was not possible to upload the file')
        }
    }

    setFolder(folder) {
        if(!folder) return
        const { pathname } = new URL(folder, this.url)
        this.folder = pathname
        this.pathname = `/${this.siteSlug}/${this.site}${pathname}`
    }

    async #getAuth() {
        const { headers } = await getAuth(this.url, this.credentials)
        return headers
    }

    async #getFormDigest(auth) {
        try {
            const formDigestResponse = await fetch(`${this.url}/_api/contextinfo`, {
                method: 'POST',
                headers: {
                    ...auth,
                    'X-FORMS_BASED_AUTH_ACCEPTED': 'f'
                }
            })
    
            if (!formDigestResponse.ok) {
                console.log(formDigestResponse)
                throw new Error('It was not possible to get the form digest')
            }
            
            const formDigestXML = await formDigestResponse.text()
            const [, formDigest] = /<d:FormDigestValue>([\s\S]*?)<\/d:FormDigestValue>/.exec(formDigestXML)
            return formDigest
        } catch (error) {
            console.log(error)
            throw new Error('It was not possible to get the form digest')
        }
    }

    async #createFile(fileName, headers) {
        try {
            const createFileRequestUrl = `${this.url}/_api/web/getfolderbyserverrelativeurl('${this.pathname}')/files/add(url='${fileName}',overwrite=true)`
            const createFileResponse = await fetch(createFileRequestUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'X-FORMS_BASED_AUTH_ACCEPTED': 'f'
                }
            })
    
            if (!createFileResponse.ok) {
                throw new Error('It was not possible to create the file')
            }
        } catch (error) {
            throw new Error('It was not possible to create the file')
        }
    }
}

module.exports = SharepointUpload
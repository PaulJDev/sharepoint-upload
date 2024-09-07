const { getAuth } = require('node-sp-auth')
const fetch = require('node-fetch')

const { v4: uuidv4 } = require('uuid');
const { createReadStream, statSync } = require('fs');
const { basename } = require('path');

const { printPercentage, bytesToMB } = require('./utils')


async function upload({ url, credentialas, path, fileName, options: { verbose, logger } = {} }) {
    const log = logger || console.log


    const { origin, pathname } = new URL(url)
    const [siteSlug, site] = pathname.split('/').filter(Boolean)
    const { href } = new URL(`/${siteSlug}/${site}`, origin)

    const { headers } = await getAuth(href, credentialas)

    const formDigestResponse = await fetch(`${href}/_api/contextinfo`, {
        method: 'POST',
        headers: {
            ...headers,
            'X-FORMS_BASED_AUTH_ACCEPTED': 'f'
        }
    })

    if (!formDigestResponse.ok) {
        throw new Error('Error al obtener el form digest')
    }
    const formDigestXML = await formDigestResponse.text()
    const [, formDigest] = /<d:FormDigestValue>([\s\S]*?)<\/d:FormDigestValue>/.exec(formDigestXML)

    const filename = fileName || basename(path)

    const createFileRequestUrl = `${href}/_api/web/getfolderbyserverrelativeurl('${pathname}')/files/add(url='${filename}',overwrite=true)`
    
    const createFileResponse = await fetch(createFileRequestUrl, {
        method: 'POST',
        headers: {
            ...headers,
            'X-RequestDigest': formDigest,
            'X-FORMS_BASED_AUTH_ACCEPTED': 'f'
        }
    })

    if (!createFileResponse.ok) {
        throw new Error('Error al crear el archivo')
    }

    const id = uuidv4()
    const chunkSize = 1024 * 1024 * 16
    const stream = createReadStream(path, { highWaterMark: chunkSize})
    let offset = 0
    let firstChunk = true
    const { size } = statSync(path)
    const sizeInMB = bytesToMB(size)

    
    if (size <= chunkSize) {
        const startUploadUrl = `${href}/_api/web/getfilebyserverrelativeurl('${pathname}/${filename}')/startupload(uploadId=guid'${id}')`
        const startUploadResponse = await fetch(startUploadUrl, {
            method: 'POST',
            headers: {
                ...headers,
                'X-RequestDigest': formDigest,
                'Content-Length': size
            },
            body: createReadStream(path)
        })

        if (!startUploadResponse.ok) {
            throw new Error('Error al iniciar la subida de archivo pequeño')
        }

        const finishUploadUrl = `${href}/_api/web/getfilebyserverrelativeurl('${pathname}/${filename}')/finishupload(uploadId=guid'${id}',fileOffset=${size})`
        const finishUploadResponse = await fetch(finishUploadUrl, {
            method: 'POST',
            headers: {
                ...headers,
                'X-RequestDigest': formDigest,
                'Content-Length': 0
            }
        })

        if (!finishUploadResponse.ok) {
            throw new Error('Error al finalizar la subida del archivo pequeño')
        }

        verbose && log(`File ${filename} uploaded`)
        return
    }


    for await (const chunk of stream) {
        if (firstChunk) {
            const startUploadUrl = `${href}/_api/web/getfilebyserverrelativeurl('${pathname}/${filename}')/startupload(uploadId=guid'${id}')`
            const startUploadResponse = await fetch(startUploadUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'X-RequestDigest': formDigest,
                    'Content-Length': chunk.length
                },
                body: chunk
            })

            if (!startUploadResponse.ok) throw new Error('Error al iniciar la subida')

            firstChunk = false
        } else if (offset + chunk.length === size) {
            const finishUploadUrl = `${href}/_api/web/getfilebyserverrelativeurl('${pathname}/${filename}')/finishupload(uploadId=guid'${id}',fileOffset=${offset})`
            const finishUploadResponse = await fetch(finishUploadUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'X-RequestDigest': formDigest,
                    'Content-Length': chunk.length
                },
                body: chunk
            })

            if (!finishUploadResponse.ok) {
                throw new Error('Error al finalizar la subida')
            }
        } else {
            const continueUploadUrl = `${href}/_api/web/getfilebyserverrelativeurl('${pathname}/${filename}')/continueupload(uploadId=guid'${id}',fileOffset=${offset})`
            const continueUploadResponse = await fetch(continueUploadUrl, {
                method: 'POST',
                headers: {
                    ...headers,
                    'X-RequestDigest': formDigest,
                    'Content-Length': chunk.length
                },
                body: chunk
            })

            if (!continueUploadResponse.ok) {
                throw new Error('Error al continuar la subida')
            }
        }

        offset += chunk.length
        console.log(`${bytesToMB(offset)} MB of ${sizeInMB} MB (${printPercentage(offset, size)})`)
    }
}
export const APP_BASE_PATH = "/collacode-crowd"
export const URL_TEASER = "media/teaser/"
export const URL_STATIC_DATA = "data"
export const URL_EVIDENCE = "media/evidence/"
export const URL_SOUND = "sounds/"
export const URL_IMAGES = "images/"
export const ALLOWED_HOSTS = false
export const DEV_MODE = true

export function getApiUrl(port=8000) {
    return `http://localhost:${port && !Number.isNaN(port) ? port : 8000}/colladata/api/v1`
}

export function getPort(port=3000) {
    return port && !Number.isNaN(port) ? port : 3000
}

// Firebase Storage is not configured for this release. Cloud media is a separate
// product phase; NEVER fabricate success, image paths or localStorage cloud data.
const MEDIA_DEFERRED_MESSAGE='بخش تصاویر در فاز بعد فعال می‌شود';
async function upload(){throw new Error(MEDIA_DEFERRED_MESSAGE)}
async function read(){return ''}
function revoke(){}
window.ElaraClubMedia=Object.freeze({enabled:false,upload,read,revoke,message:MEDIA_DEFERRED_MESSAGE});

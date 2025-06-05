export function logoff() {
    sessionStorage.clear();
    window.location.href = "/";
}
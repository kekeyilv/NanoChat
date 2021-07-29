function login() {
    let errMsg = document.querySelector("#loginMsg");
    let input = document.querySelector("input");
    let request = new XMLHttpRequest();
    request.open("POST", "/login/login", true);
    request.send(input.value);
    request.addEventListener("readystatechange", () => {
        if (request.readyState === 4) {
            if (request.responseText === "failed") errMsg.style.opacity = "1";
            else window.location.href = "/";
        }
    })
}
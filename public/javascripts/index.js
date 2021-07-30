let container = document.querySelector(".content");
let input = document.querySelector("input.msgInput");
let status = document.querySelector("#status");
let onlineList = document.createElement("div");
let fileInput = document.querySelector("input[type=file]")
let onlineStatus = document.createElement("span");
let lastMsgLength = 0;
let newMsgStatus = document.createElement("button");
{
    let onlineStatusButton = document.createElement("button");
    let dot = document.createElement("span");
    onlineList.className = "popUp onlineList";
    onlineList.tabIndex = 0;
    document.body.append(onlineList);
    dot.className = "dot";
    onlineStatus.innerText = "1人在线";
    onlineStatusButton.append(dot);
    onlineStatusButton.append(onlineStatus);
    onlineStatusButton.addEventListener("click", () => {
        onlineList.style.display = "block";
        onlineList.focus();
        onlineList.style.display = "";
    })
    status.append(onlineStatusButton);
    newMsgStatus.style.display = "none";
    newMsgStatus.style.marginRight = "15px";
    status.prepend(newMsgStatus)
}
let eventSource = new EventSource("/message");

function scroll() {
    container.scrollTop = container.scrollHeight - container.clientHeight;
}

window.addEventListener("load", () =>
    Notification.requestPermission(status => {
        if (Notification.permission !== status) Notification.permission = status;
    }).then(status => {
        if (Notification.permission !== status) Notification.permission = status;
    })
);

eventSource.addEventListener("message", e => {
    let data = JSON.parse(e.data);
    if (data["type"] === "msg") {
        try {
            if (document.hidden && data["content"].length > lastMsgLength && Notification.permission === "granted") {
                let notification = new Notification("NanoChat有新消息", {tag: "nanoChat"});
                notification.addEventListener("click", () => {
                    window.focus();
                    notification.close();
                    scroll();
                });
            }
        } catch (error) {
            console.error(error);
        }
        renderMessage(data["content"]);

    } else if (data["type"] === "list") renderList(data["content"]);
})

function undoMessage(id) {
    let request = new XMLHttpRequest();
    request.open("POST", "/message", true);
    request.send(JSON.stringify({content: id, type: "undo"}));
    request.addEventListener("readystatechange", () => {
        if (request.status === 403) window.location.href = "/login";
    })
}

function sendMessage(reply = null) {
    if (input.value) {
        if (!input.value.trim()) return;
        let request = new XMLHttpRequest();
        request.open("POST", "/message", true);
        request.send(JSON.stringify({
            content: (reply != null ? reply + "#" : "") + input.value,
            type: reply != null ? "reply" : "text"
        }));
        request.addEventListener("readystatechange", () => {
            if (request.status === 403) {
                window.location.href = "/login";
                return;
            }
            if (request.readyState === 4) scroll();
        })
        input.value = "";
    }
}

function renderList(list) {
    onlineList.innerText = "";
    onlineStatus.innerText = list.length + "人在线";
    list.forEach((item) => {
        let block = document.createElement("div");
        block.className = "item";
        block.innerText = item;
        let dot = document.createElement("span");
        dot.className = "dot";
        dot.style.float = "right";
        dot.style.marginTop = "5px";
        block.append(dot);
        onlineList.append(block);
    });
}

function renderMessage(data) {
    let scrollNeeded = (container.scrollTop === container.scrollHeight - container.clientHeight);
    container.innerHTML = "";
    let lastDate = "";
    container.style.scrollBehavior = "";
    for (let i = 0; i < data.length; i++) {
        let date = new Date(data[i]["time"]);
        let nowDate = date.toLocaleString().match(/\d+\/\d+\/\d+/)[0];
        if (nowDate !== lastDate) {
            let dateLine = document.createElement("div");
            dateLine.style.textAlign = "center";
            dateLine.style.padding = "10px 10px";
            dateLine.style.color = "#888";
            container.append(dateLine);
            lastDate = nowDate;
            dateLine.innerText = lastDate;
        }
        let line = document.createElement("div");
        line.setAttribute("msgID", i.toString());
        if (data[i]["type"] === "undo") {
            line.style.textAlign = "center";
            let tip = document.createElement("span");
            tip.innerText = data[i]["sender"] + " 撤回了一条消息";
            tip.style.color = "#888";
            line.append(tip);
        } else {
            let text = document.createElement("span");
            let info = document.createElement("span");
            line.innerText = data[i]["sender"] + ": ";
            text.className = "message";
            if (data[i]["type"] === "text") text.innerText = data[i]["content"];
            else if (data[i]["type"] === "reply") {
                let replyBox = document.createElement("div");
                let replyFrom = data[i]["content"].split("#")[0];
                replyBox.style.backgroundColor = "#2f4eac";
                replyBox.innerText = "回复自" + data[parseInt(replyFrom)]["sender"] + "的消息";
                replyBox.style.borderRadius = "10px";
                replyBox.style.padding = "10px 15px";
                replyBox.style.margin = "5px -5px";
                replyBox.style.cursor = "pointer";
                replyBox.addEventListener("click", () => {
                    let replyLine = document.querySelector("div[msgID='" + parseInt(replyFrom) + "']");
                    replyLine.scrollIntoView();
                    replyLine.style.transition = "background 0.2s ease-in";
                    replyLine.style.backgroundColor = "#ccc";
                    setTimeout(() => replyLine.style.backgroundColor = "", 1000);
                })
                let replyContent = document.createElement("div");
                replyContent.innerText = data[i]["content"].slice(replyFrom.length + 1);
                text.append(replyBox);
                text.append(replyContent);
            } else if (data[i]["type"] === "image") {
                let img = document.createElement("img");
                text.append(img);
                text.style.padding = "10px";
                img.style.borderRadius = "10px";
                img.src = "/message/file/?url=" + data[i]["content"];
                img.style.maxWidth = "100%";
                img.style.maxHeight = "25rem";
                img.addEventListener("load", () => {
                    if (scrollNeeded) scroll();
                })
                text.appendChild(img);
            } else if (data[i]["type"] === "file") {
                let contentData = data[i]["content"].split("?");
                let block = document.createElement("div");
                block.style.backgroundColor = "white";
                block.style.borderRadius = "10px";
                block.style.color = "black";
                block.style.padding = "15px";
                block.style.minWidth = "200px";
                let title = document.createElement("div");
                title.innerText = contentData[1];
                title.style.paddingBottom = "20px";
                block.append(title);
                let actionBar = document.createElement("div");
                let downloadLink = document.createElement("a");
                downloadLink.target = "_blank";
                downloadLink.href = "/message/file/?url=" + contentData[0] + "&name=" + contentData[1];
                downloadLink.innerText = "下载";
                actionBar.append(downloadLink);
                let copyButton = document.createElement("a");
                copyButton.innerText = "复制链接";
                copyButton.style.marginLeft = "10px";
                copyButton.href = "javascript:void(0)"
                copyButton.addEventListener("click", () => {
                    let temp = document.createElement("div");
                    temp.innerText = downloadLink.href;
                    document.body.append(temp);
                    let selection = getSelection();
                    selection.removeAllRanges();
                    let range = new Range();
                    range.selectNodeContents(temp);
                    selection.addRange(range);
                    document.execCommand("copy");
                    document.body.removeChild(temp);
                });
                actionBar.append(copyButton);
                block.append(actionBar);
                text.append(block);
                text.style.padding = "10px";
            }
            line.style.padding = "10px 10px";
            line.append(text);
            info.style.float = "right";
            info.innerText = new Date(data[i]["time"]).toTimeString().match(/\d+:\d+/)[0];
            info.style.color = "#888";
            line.append(info);
            text.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                let popUp = document.createElement("div");
                popUp.tabIndex = 0;
                popUp.className = "popUp";
                let ip = document.createElement("div");
                ip.innerText = " IP:" + data[i]["address"];
                ip.style.padding = "5px 15px";
                ip.style.color = "#888";
                popUp.append(ip);
                let undo = document.createElement("div");
                undo.className = "item";
                undo.innerText = "撤回";
                undo.addEventListener("click", () => {
                    undoMessage(i);
                });
                popUp.style.left = e.clientX + "px";
                popUp.style.top = e.clientY - container.offsetTop + container.scrollTop + "px";
                popUp.append(undo);
                let reply = document.createElement("div");
                reply.className = "item";
                reply.innerText = "回复";
                reply.addEventListener("click", () => {
                    sendMessage(i);
                })
                popUp.append(reply);
                line.append(popUp);
                popUp.style.display = "block";
                popUp.focus();
                popUp.style.display = "";
                popUp.addEventListener("blur", () => {
                    popUp.remove();
                })
            })
        }
        container.append(line);
    }
    container.style.scrollBehavior = "smooth";
    if (scrollNeeded) scroll();
    else {
        if (data.length > lastMsgLength) {
            newMsgStatus.style.display = "inline-block";
            newMsgStatus.innerText = (data.length - lastMsgLength + (parseInt(newMsgStatus.innerText) || 0)).toString();
        }
    }
    lastMsgLength = data.length;
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
})

function uploadFile(callback) {
    fileInput.oninput = () => {
        if (fileInput.files[0]) {
            let formData = new FormData();
            formData.append("file", fileInput.files[0]);
            let request = new XMLHttpRequest();
            request.open("POST", "/message/file", true);
            request.send(formData);
            request.addEventListener("readystatechange", () => {
                if (request.status === 403) window.location.href = "/login";
                else if (request.readyState === 4 && request.status === 200) callback(request.responseText, fileInput.files[0].name);
            });
        }
    }
}

document.querySelector("#imgSend").addEventListener("click", () => {
    fileInput.click();
    uploadFile((url) => {
        let request = new XMLHttpRequest();
        request.open("POST", "/message", true);
        request.send(JSON.stringify({content: url, type: "image"}));
        request.addEventListener("readystatechange", () => {
            if (request.status === 403) window.location.href = "/login";
            else if (request.readyState === 4) scroll();
        })
    });
})

document.querySelector("#fileSend").addEventListener("click", () => {
    fileInput.click();
    uploadFile((url, name) => {
        let request = new XMLHttpRequest();
        request.open("POST", "/message", true);
        request.send(JSON.stringify({content: url + "?" + name, type: "file"}));
        request.addEventListener("readystatechange", () => {
            if (request.status === 403) window.location.href = "/login";
            else if (request.readyState === 4) scroll();
        })
    });
})

container.addEventListener("scroll", () => {
    if (container.scrollTop === container.scrollHeight - container.clientHeight) {
        newMsgStatus.style.display = "none";
        newMsgStatus.innerText = "";
    }
})

newMsgStatus.addEventListener("click", scroll);
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
//chess move
var board;
var game;

window.onload = function () {
    initGame();
};

var initGame = function () {
    var cfg = {
        draggable: true,
        position: 'start',
        onDrop: handleMove,
    };

    board = new ChessBoard('gameBoard', cfg);
    game = new Chess();
};

var handleMove = function (source, target) {
    var move = game.move({ from: source, to: target });

    if (move === null) return 'snapback';
};
//getting query params
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get("username");
const room = urlParams.get("room");


const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

const socket = io();

//emitting room name
// socket.emit('join-room', { username, room });

//vc code
let localStream;
let remoteStream;
let peerConnection;
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        socket.emit('join-room', { username, room });
    })
    .catch((error) => {
        console.error('Error accessing media devices:', error);
    });

socket.on('user-connected', () => {
    console.log('User connected');
    startCall();
});

socket.on('user-disconnected', () => {
    console.log('User disconnected');
    endCall();
});

function startCall() {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remote-video');
        remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', room, event.candidate);
        }
    };

    socket.on('ice-candidate', (candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch((error) => {
                console.error('Error adding ICE candidate:', error);
            });
    });

    peerConnection.createOffer()
        .then((offer) => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', room, peerConnection.localDescription);
        })
        .catch((error) => {
            console.error('Error creating offer:', error);
        });
}

socket.on('offer', (offer) => {
    const peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remote-video');
        remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', room, event.candidate);
        }
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            return peerConnection.createAnswer();
        })
        .then((answer) => {
            return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('answer', room, peerConnection.localDescription);
        })
        .catch((error) => {
            console.error('Error creating answer:', error);
        });
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .catch((error) => {
            console.error('Error setting remote description:', error);
        });
});

function toggleMic() {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
}

function toggleVideo() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
}

function endCall() {
    const remoteVideo = document.getElementById('remote-video');
    remoteVideo.srcObject = null;
    remoteStream = null;
}
//chess
var handleMove = function (source, target) {
    var move = game.move({ from: source, to: target });

    if (move === null) return 'snapback';
    else socket.emit('move', move);

};

socket.on('move', function (msg) {
    game.move(msg);
    board.position(game.fen()); // fen is the board layout
});

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = e.target.elements.msg.value;
    socket.emit('chatMsg', msg);

    //Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
})
socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
})
socket.on('message', (data) => {
    console.log(data);
    appendMsg(data);

    //Scroll Down
    chatMessages.scrollTop = chatMessages.scrollHeight


})

function appendMsg(msg) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${msg.username}<span>${msg.time}</span></p>
						<p class="text">
							${msg.message}
						</p>`
    document.querySelector('.chat-messages').appendChild(div);

}

function outputRoomName(room) {
    roomName.innerText = room
}
function outputUsers(users) {
    userList.innerHTML = `${users.map(user => `<li>${user.username}</li>`).join('')}`
}
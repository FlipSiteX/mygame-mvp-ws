import express from "express"
import cors from "cors"
import http from "http"
import { Server } from 'socket.io';

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

const app = express()

app.use(express.json())
app.use(cors(corsOptions))

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

let users = [];
let userQueue = [];

let activeUser = null;
let activeQuestion = null;

const changeUser = () => {
    let index = userQueue.indexOf(activeUser) + 1

    if (index == userQueue.length) {
        index = 0
        activeUser = userQueue[index]
        return
    }

    activeUser = userQueue[index]
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Подключение к игре
    socket.on("joinGame", (user) => {

        if (user) {
            
            if(!users.find(el => el.username == user.username)) {
                users.push(user)
                socket.emit("myUser", user)
            } else {
                socket.emit("myUser", users.find(el => el.username == user.username))
            }

        }

        // Возвращает всех подключённых пользователей
        io.emit("all", users)
        io.emit("setActiveQuestion", activeQuestion)
    });

    // Изменение отвечающего пользователя
    socket.on("changeUser", () => {

        changeUser()

        // Возвращает нового отвечающего пользователя 
        io.emit("newActiveUser", activeUser)
    })

    socket.on("closeQuestion", () => {
        io.emit("setActiveQuestion", activeQuestion)
    })

    // Добавление очков
    socket.on("addPoints", ({ activeUser, points }) => {

        if (activeUser) {
            users.find((el) => el.username == activeUser.username).points += +points;
			userQueue = [];
        }

        // Возвращение обновленного списка игроков
        io.emit('newUserList', users)

    })

    // Выбор вопросы
    socket.on("selectQuestion", (question) => {

        activeQuestion = question;

        // Возвращает выбранный вопрос на клиент
        io.emit("setActiveQuestion", activeQuestion)
    })

    // Срабатывает когда пользователь жмёт на кнопку ответить
    socket.on("answerQuestion", (user) => {

        if (userQueue.find(el => el.username == user.username)) {
            return
        }

        userQueue.push(user)

        if (!activeUser) {
            activeUser = userQueue[0]

            // Возвращает нового отвечающнго пользователя 
            io.emit("getActiveUser", activeUser)
        }

        // Возвращает список нажавших на кнопук пользоватлей
        io.emit("getQueue", userQueue)
    })

    // Отключение от сервера
    socket.on('disconnect', () => {
        activeQuestion = null;
        console.log('Отключились')
    })
});


// API
app.get("/", (res) => {
    res.send("API")
})

server.listen(3800, () => {
    console.log("SERVER START")
})
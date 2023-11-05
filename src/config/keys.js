
let dbPassword = `mongodb+srv://${process.env.DataBase_USER_NAME}:${process.env.DataBase_PASSWORD}`+'@cluster0.mpplrni.mongodb.net?retryWrites=true';

module.exports = {
    mongoURI: dbPassword
};

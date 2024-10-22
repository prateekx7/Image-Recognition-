const express = require('express');
const aws = require('aws-sdk');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1'
});

const rekognition = new aws.Rekognition();


const uploadsDir = './uploads/';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage }).single('image');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res) => {
    res.render('index', { error: null, labels: [] });
});

app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.render('index', { error: err.message, labels: [],imageUrl: null });
        } else if (err) {
            return res.render('index', { error: 'Error while uploading file!', labels: [],imageUrl: null });
        }

        const image = req.file;

        if (image) {
            const imagePath = image.path;
            const imageBuffer = fs.readFileSync(imagePath);

            const params = {
                Image: {
                    Bytes: imageBuffer
                }
            };

            rekognition.detectLabels(params, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    res.render('index', { error: 'Error in analysing Image', labels: [],imageUrl: null });
                } else {
                    const imageUrl = '/' + imagePath;
                    console.log('Rekognition response:', data);
                    res.render('index', { error: null, labels: data.Labels,imageUrl: imageUrl }); 
                }
            });

        } else {
            res.render('index', { error: 'Please upload any image!', labels: [],imageUrl: null });
        }
    });
});

app.listen(3000);

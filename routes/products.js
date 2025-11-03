const express = require('express');
const router = express.Router();

const {
    getProducts,
    getProducts_clothing
} = require('../controllers/web_controllers.js')


router.route('/').get(getProducts);
router.route('/petclothing').get(getProducts_clothing);


module.exports = router;
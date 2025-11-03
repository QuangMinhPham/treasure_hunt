const express = require('express');
const router = express.Router();

const {
    signup,
    login,
    link_register_and_login
} = require('../controllers/web_controllers.js')

router.route('/add-user').post(signup);
router.route('/login').post(login);
router.route('/register_and_login').get(link_register_and_login);

module.exports = router;

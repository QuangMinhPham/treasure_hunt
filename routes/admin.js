const express = require('express');
const router = express.Router();

const { link_admin_add_products,
    add_products,
    isAdmin,
    getAdminProfile,
    admin_hompage,
    fetch_admin,
    link_block_page,
    upload
} = require('../controllers/web_controllers')

router.route('/').get(admin_hompage);
router.route('/add-products')
    .get(link_admin_add_products) 
    .post(upload.single('image'), add_products);
    
router.route('/profile').get(isAdmin,getAdminProfile);
router.route('/blockAccess').get(link_block_page);

module.exports = router; 
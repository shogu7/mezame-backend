# Mezame Backend

This is the backend for **Mezame**, handling all database interactions with the frontend.  
It manages manhwa, users, different operations (create, update, delete), and enforces access control for admins.

---

## Main Features

- **User Authentication:** Handles signup, login, and JWT-based authentication.  
- **Manhwa Management:** Create, update, delete, and fetch manhwa data.  
- **User Profiles:** Manage user information, progress, and library.  
- **Admin Actions:** Manage users, permissions, validate community submissions, and delete content.  
- **Security:** Ensures that non-admin users cannot perform restricted actions.

---

## Database Scripts / Automation

This backend also includes scripts to automate and manage the database efficiently:  
- Bulk upload of manhwa covers via Cloudinary  
- Automatic insertion or update of manhwa data  
- Utility scripts for maintaining and cleaning database content

---

## Tech Stack

- **Node.js**  
- **Express**  
- **MySQL / Sequelize**  
- **JWT**  
- **bcrypt**  
- **Cloudinary**  
- **dotenv**  
- **fs** (for file operations)  
- **Sequelize functions** (`fn`, `col`) for advanced queries

---

## Deployment

This backend works together with the frontend ([Mezame Frontend](https://mezame.cloud-ip.cc/)) to provide the full functionality of the app.

/** User class for message.ly */
/** User of the site. */
const db = require("../db")
const ExpressError = require("../expressError")
const bcrypt = require("bcrypt")
const { BCRYPT_WORK_FACTOR} = require("../config")
class User {
  constructor(username, first_name,last_name, phone){
    this.username = username;
    this.first_name = first_name;
    this.last_name = last_name;
    this.phone = phone;
  }

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) {

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
    const result = await db.query(
        `INSERT INTO users (
          username,
          password,
          first_name,
          last_name,
          phone,
          join_at,
          last_login_at)
          VALUES ($1, $2, $3,$4, $5, current_timestamp,current_timestamp )
            RETURNING username, password, first_name, last_name, phone`,
        [username, hashedPassword, first_name, last_name, phone]);
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean.  
   * let user = result.rows[0];

    return user && await bcrypt.compare(password, user.password);
   */

  static async authenticate(username, password) { 
  const result =  await db.query(`
    SELECT username, password 
    FROM users 
    WHERE username = $1`,
    [username]);
    const user = result.rows[0];
    return await bcrypt.compare(password, user.password) && user;
  }
  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
  const res = await db.query(`
  UPDATE users SET last_login_at = $1 WHERE username=$2 RETURNING username`,
  [current_timestamp, username]);  
    if(!res.rows[0]){
      throw new ExpressError(`No such user ${username}`, 404)
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() { 
    const result = await db.query(`SELECT username, first_name,last_name,phone FROM users ORDER BY username`)
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 
    const result = await db.query(`SELECT username, first_name,last_name,phone,join_at,last_login_at FROM users 
    WHERE username=$1`, [username])
    if(!result.rows[0]){
      throw new ExpressError(`No such user ${username}`, 404)
    }
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    const results = await db.query(`
    SELECT msg.id, msg.to_username, msg.body, msg.sent_at, msg.read_at, u.first_name, u.last_name, u.phone 
    FROM messages as msg
    JOIN users as u ON msg.to_username = u.username
    WHERE username=$1`, [username])

    return result.rows.map(m => ({
      id: m.id,
      to_user: {
        username: m.to_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at
    }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(`
    SELECT msg.id, msg.from_username, msg.body, msg.sent_at, msg.read_at, u.first_name, u.last_name, u.phone 
    FROM messages as msg
    JOIN users as u ON msg.from_username = u.username
    WHERE username=$1`, [username])
    return result.rows.map(m => ({
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at
    }));
  }
}

module.exports = User;
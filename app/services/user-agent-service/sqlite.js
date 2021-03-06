/*
 Copyright 2016 Mozilla

 Licensed under the Apache License, Version 2.0 (the "License"); you may not use
 this file except in compliance with the License. You may obtain a copy of the
 License at http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software distributed
 under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 CONDITIONS OF ANY KIND, either express or implied. See the License for the
 specific language governing permissions and limitations under the License.
 */

/**
 * When life gives you callbacks, write your own promise wrapper.
 *
 * @module SQLite
 */

import sqlite3 from 'sqlite3';
import thenifyAll from 'thenify-all';
import { logger } from '../../shared/logging';

const Promise = global.Promise;
const debug = false;

export function verbose() {
  sqlite3.verbose();
}

/**
 * Turn methods on `source` that return callbacks into methods on `dest` that are bound to
 * `source` as if invoked as method calls.
 *
 * @param source an object with methods named by `methods`.
 * @param dest an object upon which attributes will be set.
 * @param methods an array of method names.
 */
function thenifyMethods(source, dest, methods) {
  const wrapped = thenifyAll(source, {}, methods);
  for (const method of methods) {
    dest[method] = wrapped[method].bind(source);
  }
}

export class DB {
  constructor(db) {
    this.db = db;
    thenifyMethods(db, this, ['close', 'get', 'all', 'exec']);
  }

  prepare(sql, params) {
    return new Promise((resolve, reject) => {
      const statement = this.db.prepare(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(statement);
        }
      });
    });
  }

  /**
   * Invokes the provided `onRow` callback with each result row.
   * Returns a promise that resolves to the number of returned rows.
   *
   * @param sql the query to run.
   * @param params any parameters to bind.
   * @param onRow a function of one argument, `(row)`.
   * @returns {Promise<int>} the number of returned rows.
   */
  each(sql, params, onRow) {
    return new Promise((resolve, reject) => {
      let done = false;

      const rowCallback = (err, row) => {
        if (done) {
          return;
        }

        if (err) {
          logger.error(`SQL error in row function: ${err} in ${sql}.`);
          done = true;
          reject(err);
          return;
        }

        onRow(row);
      };

      const completionCallback = (err, count) => {
        if (err) {
          logger.error(`SQL error in completion function: ${err} in ${sql}.`);
          reject(err);
          return;
        }

        resolve(count);
      };

      this.db.each(sql, params, rowCallback, completionCallback);
    });
  }

  run(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (debug) {
          logger.info(`Running: ${sql}, ${JSON.stringify(params)}`);
        }

        if (err) {
          logger.info(`SQL error: ${err} in ${sql}.`);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   *
   * @param filename the file path to open
   * @param mode any mode flags to pass to `sqlite3.Database`.
   *             Defaults to OPEN_CREATE | OPEN_READWRITE.
   * @returns Promise that resolves to the opened database.
   */
  static open(filename, mode = sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE) {
    return new Promise((resolve, reject) => {
      const sq = new sqlite3.Database(filename, mode, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(new DB(sq));
        }
      });
    });
  }
}

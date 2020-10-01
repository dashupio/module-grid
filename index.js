// require first
const { Module } = require('@dashup/module');

// import base
const GridPage = require('./pages/grid');

/**
 * export module
 */
class GridModule extends Module {

  /**
   * construct discord module
   */
  constructor() {
    // run super
    super();
  }
  
  /**
   * registers dashup structs
   *
   * @param {*} register 
   */
  register(fn) {
    // register sms action
    fn('page', GridPage);
  }
}

// create new
module.exports = new GridModule();

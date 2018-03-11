module.exports = class Serializer {
  _processObject(object) {
    if (!object.hasOwnProperty('$$cloneIdx')) {
      // this is the first time we encounter this object

      // save for cleaning
      this.objectsToClean.push(object);
      // console.log(object)
      let customCloning;
      try{
      customCloning = 'clone' in object;
    } catch (e) {debugger}
      const clone = customCloning ?
        object.clone(this.opt)
        : Object.assign({}, object);

      if (clone === undefined) {
        // its clone returned undefined so we mark this on the original
        object.$$cloneIdx = undefined;
      } else if (clone instanceof Object) {
        // we have an actual object to store

        // store the constructor name
        if (!clone.hasOwnProperty('$$classId')) {
          clone.$$classId = Reflect.getPrototypeOf(customCloning ? clone : object).constructor.name;
        }

        // save the cloned object and mark the id on the object
        object.$$cloneIdx = this.clones.push(clone) - 1;
      } else {
        throw Error('expected clone to return an object');
      }
    }
  }

  _processProperty(owner, [key, value]) {
    if (value instanceof Object) {
      this._processObject(value);
      if (value.$$cloneIdx === undefined) { // check if the value is marked for deletion
        delete owner[key];
      } else {
        owner[key] = {$$ref: value.$$cloneIdx};
      }
    }
  }

  serialize(object, opt) {
    this.opt = opt;
    this.clones = [];
    this.objectsToClean = [];

    this._processObject(object);

    for (let i = 0; i < this.clones.length; i++) {
      const clone = this.clones[i];

      Object
        .entries(clone)
        .forEach(this._processProperty.bind(this, clone));
    }

    // cleanup
    this.objectsToClean.forEach((_) => {
      delete _.$$cloneIdx;
    });

    return JSON.stringify(this.clones);
  }
};
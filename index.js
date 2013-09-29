var mdeps = require('module-deps');
var through = require('through');
var mustache = require('mustache');
var fs = require('fs');
var path = require('path');

exports.build = function (options, cb) {
    var globule = new Globule(options);

    globule.build(cb);
};

function Globule(options) {
    this.main = options.main;
}

function normalize(id) {
    return path.relative('.', id).replace(/^node_modules\//, '').replace(/\.js$/, '');
}

function replaceRequires(mod) {
    Object.keys(mod.deps).forEach(function (call) {
        //var id = normalize(mod.deps[call]);

        console.log(mod.source.match(new RegExp(call)))
    });

    return mod.source;
}

Globule.prototype.build = function (cb) {
    var that = this;
    var stream = mdeps('/Users/dawi/Work/earpjs/index.js', {filter: function (id) {
        if (id === 'fs') {
            return false;
        }
        return true;
    }});

    this.modules = [];

    stream.pipe(through(
        function (mod) {
            that.addModule(mod);
        },
        function () {
            cb(mustache.render(
                fs.readFileSync(
                    __dirname + '/globule.mustache'
                ).toString(),
                {modules: that.modules}
            ));
        }
    ));

};

Globule.prototype.addModule = function (mod) {
    this.modules.push({id: normalize(mod.id), source: replaceRequires(mod).replace(/\n/g, ''), deps: mod.deps});
};
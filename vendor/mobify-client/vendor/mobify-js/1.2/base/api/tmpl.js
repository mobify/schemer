(function($, Mobify) {

var Context = dust.makeBase({}).constructor
  , Chunk = dust.stream('', {}).head.constructor
  , oldBlock = Chunk.prototype.block;

$.each(["exists", "notexists", "reference", "section"], function(i, name) {
    var oldFn = Chunk.prototype[name];
    var needsExecutionWrapper = name.match("exists");

    Chunk.prototype[name] = function(elem, context, bodies, extras) {
        if (elem && elem._callable) elem = elem._callable;

        if (needsExecutionWrapper && (typeof elem === "function")) {
            elem = elem(this, context, bodies, 'notexists');
            if (elem instanceof Chunk) {
              return elem;
            }
        }            

        return oldFn.call(this, elem, context, bodies, extras);
    }
});

Chunk.prototype.block = function(elem, context, bodies) {
    var topElem = elem ? elem.shift() : undefined;
    if (topElem) {          
        context = new context.constructor(
            context.stack, 
            $.extend(context.global || {}, {
                '_SUPER_': function(_elem, context, _bodies) {
                    return _elem.block(elem, context, bodies);
                }})
            , context.blocks);
    }
    
    return oldBlock.call(this, topElem, context, bodies);
};

var descend = function(ctx, down, i) {
    while (ctx && i < down.length) {
        if (typeof ctx.done === "function" && !ctx.done()) {
            return ctx._delayInspection();
        } else {
            ctx = ctx[down[i++]];
        }
    }        
    return ctx;
};

Context.prototype.getAscendablePath = function(cur, down) {
    var ctx = this.stack;

    if (cur) return this.getPath(cur, down);
    if (!ctx.isObject) return undefined;

    ctx = this.get(down[0]);

    return descend(ctx, down, 1);
};    

Context.prototype.getBlock = function(key) {
    var blocks = this.blocks;

    if (!blocks) return [];

    blocks = $.map(blocks, function(block) {
        return block[key];
    });
    return blocks;
}
    
var likeArray = function(candidate) {
        return (typeof candidate != 'string') 
            && (typeof candidate.length == 'number')
            && (!candidate.tagName);
    };

// Additional dust filters
// html returns node outerHTML
// innerHTML returns node innerHTML
// openTag and closeTag return first opening and last closing tags from a string
$.extend(dust.filters, {
    h: function(node) {
        if (!node) return '';
        if (likeArray(node)) {
            return $.map(node, dust.filters.h).join('');
        }

        return (typeof node.outerHTML !== 'undefined')
            ? node.outerHTML
            : dust.escapeHtml(node);
    }
    
  , innerHTML: function(node) {
        if (!node) return '';
        if (likeArray(node)) {
            return $.map(node, function(el) {
                return el.innerHTML || el.nodeValue;
            }).join('')
        } else {
            return $(node).html();
        }
    }
  , openTag: Mobify.html.openTag

  , closeTag: Mobify.html.closeTag
});

var conditionalHelper = function(chunk, context, bodies, accept) {
    if (accept) {
        return bodies.block(chunk, context);
    } else if (bodies['else']) {
        return bodies['else'](chunk, context);
    } else {
        return chunk;
    }
}

$.extend(dust.helpers, {
    first: function(chunk, context, bodies) {
        var accept = context.stack.index === 0;
        return conditionalHelper(chunk, context, bodies, accept);
    },
    last: function(chunk, context, bodies) {
        var accept = context.stack.index === context.stack.of - 1;
        return conditionalHelper(chunk, context, bodies, accept);
    }
})
    
var oldIsArray = dust.isArray;
dust.isArray = function(arr) {
    return (arr && arr.appendTo) || oldIsArray(arr);
}

var oldLoad = dust.load;
dust.load = function(name, chunk, context) {
    return name ? oldLoad.apply(this, arguments) : chunk;
}
                
})(Mobify.$, Mobify);
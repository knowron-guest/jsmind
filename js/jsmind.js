(function($w){
    "use strict";       
    // set 'jsMind' as the library name.
    // __name__ should be a const value, Never try to change it easily.
    var __name__ = 'jsMind';
    // library version
    var __version__    = '0.2';
    // author
    var __author__ = 'hizzgdev@163.com';

    // check global variables
    if(typeof($w[__name__])!='undefined'){
        _console.log(__name__+' has been already exist.');
        return;
    }

    // an noop function define
    var _noop = function(){};
    var _console = (typeof(console) == 'undefined')?{
            log:_noop, debug:_noop, error:_noop, warn:_noop, info:_noop
        }:console;

    // shortcut of methods in dom
    var $d = $w.document;
    var $g = function(id){return $d.getElementById(id);};
    var $c = function(tag){return $d.createElement(tag);};
    var $t = function(n,t){if(n.hasChildNodes()){n.firstChild.nodeValue = t;}else{n.appendChild($d.createTextNode(t));}};

    /*
     * !! ATTENTION !!
     * DO NOT EXPAND OPTIONS TO 3 LEVEL OR MORE.
     * LOWER OPTIONS WILL NOT BE MERGE BUT REWRITE
     */
    var DEFAULT_OPTIONS = {
        container : 'jsmind_container',   // id of the container
        editable : false,                 // you can change it in your options
        theme : null,
        mode :'full', // full or side

        view:{
            hmargin:100,
            vmargin:50
        },
        layout:{
            hspace:30,
            vspace:20,
            pspace:13
        }
    };

    // core object
    var jm = function(options){
        this.version = __version__;
        /*
         * merge DEFAULT_OPTIONS and options
         * only merge in 2 level, lower will be rewrite
         */
        var opts = {};
        for (var o in DEFAULT_OPTIONS) {opts[o] = DEFAULT_OPTIONS[o];}
        for (var o in options) { if((o in opts) && (typeof options[o]) == 'object'){ for (var k in options[o]){opts[o][k] = options[o][k];} }else{ opts[o]=options[o]; } }

        this.options = opts;
        this.mind = null;
        this._init_ = false;
    };

    // ============= static object =============================================
    jm.direction = {left:-1,center:0,right:1};

    jm.node = function(sId,iIndex,sTopic,oData,bIsRoot,oParent,eDirection){
        if(!sId){_console.error('invalid nodeid');return;}
        if(typeof(iIndex) != 'number'){_console.error('invalid node index');return;}
        this.id = sId;
        this.index = iIndex;
        this.topic = sTopic;
        this.data = oData;
        this.isroot = bIsRoot;
        this.parent = oParent;
        this.direction = eDirection;
        this.children = [];
        this._data = {};
    };

    jm.node.compare=function(node1,node2){
        // '-1' is alwary the last
        var r = 0;
        var i1 = node1.index;
        var i2 = node2.index;
        if(i1>=0 && i2>=0){
            r = i1-i2;
        }else if(i1==-1 && i2==-1){
            r = 0;
        }else if(i1==-1){
            r = 1;
        }else if(i2==-1){
            r = -1;
        }else{
            r = 0;
        }
        //_console.debug(i1+' <> '+i2+'  =  '+r);
        return r;
    };


    jm.mind = function(){
        this.name = null;
        this.author = null;
        this.version = null;
        this.root = null;
        this.selected = null;
        this.nodes = {};
    };

    jm.mind.prototype = {
        get_node:function(nodeid){
            if(nodeid in this.nodes){
                return this.nodes[nodeid];
            }else{
                _console.warn('the node[id='+nodeid+'] can not be found');
                return null;
            }
        },

        set_root:function(nodeid, topic, data){
            if(this.root == null){
                this.root = new jm.node(nodeid, 0, topic, data, true);
                this._put_node(this.root);
            }else{
                _console.error('root node is already exist');
            }
        },

        add_node:function(parent_node, nodeid, topic, data, idx, direction){
            if(typeof parent_node == 'string'){
                return this.add_node(this.get_node(parent_node), nodeid, topic, data, idx, direction);
            }
            var nodeindex = idx || -1;
            if(!!parent_node){
                _console.debug(parent_node);
                var node = null;
                if(parent_node.isroot){
                    var d = jm.direction.left;
                    if(isNaN(direction) || direction != jm.direction.left){
                        d = jm.direction.right;
                    }
                    if(d == jm.direction.left){
                        this._view.left_count++;
                    }else{
                        this._view.right_count++;
                    }
                    node = new jm.node(nodeid,nodeindex,topic,data,false,parent_node,d);
                }else{
                    node = new jm.node(nodeid,nodeindex,topic,data,false,parent_node);
                }
                if(this._put_node(node)){
                    parent_node.children.push(node);
                    this._reindex(parent_node);
                }else{
                    _console.error('fail, the nodeid \''+node.id+'\' has been already exist.');
                    node = null;
                }
                return node;
            }else{
                _console.error('fail, the [node_parent] can not be found.');
                return null;
            }
        },

        insert_node_before:function(node_before, nodeid, topic, data){
            if(typeof node_before == 'string'){
                return this.insert_node_before(this.get_node(node_before), nodeid, topic, data);
            }
            if(!!node_before){
                var node_index = node_before.index-0.5;
                return this.add_node(node_before.parent, nodeid, topic, data, node_index);
            }else{
                _console.error('fail, the [node_before] can not be found.');
                return null;
            }
        },

        insert_node_after:function(node_after, nodeid, topic, data){
            if(typeof node_after == 'string'){
                return this.insert_node_after(this.get_node(node_after), nodeid, topic, data);
            }
            if(!!node_after){
                var node_index = node_after.index + 0.5;
                return this.add_node(node_after.parent, nodeid, topic, data, node_index);
            }else{
                _console.error('fail, the [node_after] can not be found.');
                return null;
            }
        },

        move_node:function(nodeid, beforeid){
            var node = this.get_node(nodeid);
            if(!!node && !!beforeid){
                if(beforeid == '_last_'){
                    node.index = -1;
                    this._reindex(node.parent);
                }else if(beforeid == '_first_'){
                    node.index = 0;
                    this._reindex(node.parent);
                }else{
                    var node_before = (!!beforeid)?this.get_node(beforeid):null;
                    if(node_before!=null && node_before.parent!=null && node_before.parent.id==node.parent.id){
                        node.index = node_before.index - 0.5;
                        this._reindex(node.parent);
                    }
                }
            }
            return node;
        },

        remove_node:function(node){
            if(typeof node == 'string'){
                return this.remove_node(this.get_node(node));
            }
            if(!node){
                _console.error('fail, the node can not be found');
                return false;
            }
            if(node.isroot){
                _console.error('fail, can not remove the root node');
                return false;
            }
            if(this.selected!=null && this.selected.id == node.id){
                this.selected = null;
            }
            // clean all subordinate nodes
            var children = node.children;
            var ci = children.length;
            while(ci--){
                this.remove_node(children[ci]);
            }
            // clean all children
            children.length = 0;
            // remove from parent's children
            var sibling = node.parent.children;
            var si = sibling.length;
            while(si--){
                if(sibling[si].id == node.id){
                    sibling.splice(si,1);
                    break;
                }
            }
            // remove from global nodes
            delete this.nodes[node.id];
            // clean all properties
            for(var k in node){
                delete node[k];
            }
            // remove it's self
            node = null;
            //delete node;
            return true;
        },

        _put_node:function(node){
            if(node.id in this.nodes){
                _console.warn('the nodeid \''+node.id+'\' has been already exist.');
                return false;
            }else{
                this.nodes[node.id] = node;
                return true;
            }
        },

        _reindex:function(node){
            if(node instanceof jm.node){
                node.children.sort(jm.node.compare);
                for(var i=0;i<node.children.length;i++){
                    node.children[i].index = i+1;
                }
            }
        },

    };



    jm.format = {
        node_array:{
            example:{
                "meta":{
                    "name":__name__,
                    "author":__author__,
                    "version":__version__
                },
                "format":"node_array",
                "nodes":[
                    {"id":"root","topic":"jsMind Example", "isroot":true}
                ]
            },

            get_mind:function(source){
                _console.log(source);
                var df = jm.format.node_array;
                var mind = new jm.mind();
                mind.name = source.meta.name;
                mind.author = source.meta.author;
                mind.version = source.meta.version;
                df._parse(mind,source.nodes);
                return mind;
            },

            get_data:function(mind){
                var df = jm.format.node_array;
                var json = {};
                json.meta = {
                    name : mind.name,
                    author : mind.author,
                    version : mind.version
                };
                json.format = "node_array";
                json.nodes = [];
                df._array(mind,json.nodes);
                return json;
            },

            _parse:function(mind, node_array){
                var df = jm.format.node_array;
                var narray = node_array.slice(0);
                // reverse array for improving looping performance
                narray.reverse();
                var root_id = df._extract_root(mind, narray);
                if(!!root_id){
                    df._extract_subnode(mind, root_id, narray);
                }else{
                    _console.error('the root node can not be found');
                }
            },

            _extract_root:function(mind, node_array){
                var df = jm.format.node_array;
                var i = node_array.length;
                while(i--){
                    if('isroot' in node_array[i] && node_array[i].isroot){
                        var root_json = node_array[i];
                        var data = df._extract_data(root_json);
                        mind.set_root(root_json.id,root_json.topic,data);
                        node_array.splice(i,1);
                        return root_json.id;
                    }
                }
                return null;
            },

            _extract_subnode:function(mind, parentid, node_array){
                var df = jm.format.node_array;
                var i = node_array.length;
                var node_json = null;
                var data = null;
                var extract_count = 0;
                while(i--){
                    node_json = node_array[i];
                    if(node_json.parentid == parentid){
                        data = df._extract_data(node_json);
                        var d = null;
                        var node_direction = node_json.direction;
                        if(!!node_direction){
                            d = node_direction == 'left'?jm.direction.left:jm.direction.right;
                        }
                        mind.add_node(parentid, node_json.id, node_json.topic, data, null, d);
                        node_array.splice(i,1);
                        extract_count ++;
                        var sub_extract_count = df._extract_subnode(mind, node_json.id, node_array);
                        if(sub_extract_count > 0){
                            // reset loop index after extract subordinate node
                            i = node_array.length;
                            extract_count += sub_extract_count;
                        }
                    }
                }
                return extract_count;
            },

            _extract_data:function(node_json){
                var data = {};
                for(var k in node_json){
                    if(k == 'id' || k=='topic' || k=='parentid' || k=='isroot' || k=='direction'){
                        continue;
                    }
                    data[k] = node_json[k];
                }
                return data;
            },

            _array:function(mind, node_array){
                var df = jm.format.node_array;
                df._array_node(mind.root, node_array);
            },

            _array_node:function(node, node_array){
                var df = jm.format.node_array;
                if(!(node instanceof jm.node)){return;}
                var d = undefined;
                if(!!node.parent && node.parent.isroot){
                    d = node.direction == jm.direction.left?'left':'right';
                }
                var o = {
                    id : node.id,
                    topic : node.topic,
                    parentid : (!!node.parent)?node.parent.id:undefined,
                    isroot : node.isroot?true:undefined,
                    direction:d
                };
                if(node.data != null){
                    for(var k in node.data){
                        o[k] = node.data.k;
                    }
                }
                node_array.push(o);
                var ci = node.children.length;
                for(var i=0;i<ci;i++){
                    df._array_node(node.children[i], node_array);
                }
            },
        },

        node_tree:{
            get_mind:function(json_object){
            },
            get_data:function(mind){
            }
        },
        freemind:{
            get_mind:function(xml){
                var df = jm.format.freemind;
                var xml_doc = df._parse_xml(xml);
                var xml_root = df._find_root(xml_doc);
                var mind = new jm.mind();
                df._load_node(mind, null, xml_root);
                //mind.name = source.meta.name;
                //mind.author = source.meta.author;
                //mind.version = source.meta.version;
                return mind;
            },

            get_data:function(mind){

            },

            _parse_xml:function(xml){
                var xml_doc = null;
                if (window.DOMParser){
                    var parser = new DOMParser();
                    xml_doc = parser.parseFromString(xml,"text/xml");
                }else{ // Internet Explorer
                    xml_doc = new ActiveXObject("Microsoft.XMLDOM");
                    xml_doc.async = false;
                    xml_doc.loadXML(xml); 
                }
                return xml_doc;
            },

            _find_root:function(xml_doc){
                var nodes = xml_doc.childNodes;
                var node = null;
                var root = null;
                var n = null;
                for(var i=0;i<nodes.length;i++){
                    n = nodes[i];
                    if(n.nodeType == 1 && n.tagName == 'map'){
                        node = n;
                        break;
                    }
                }
                if(!!node){
                    var ns = node.childNodes;
                    node = null;
                    for(var i=0;i<ns.length;i++){
                        n = ns[i];
                        if(n.nodeType == 1 && n.tagName == 'node'){
                            node = n;
                            break;
                        }
                    }
                }
                return node;
            },

            _load_node:function(mind, parent_id, xml_node){
                var df = jm.format.freemind;
                var node_id = xml_node.getAttribute('ID');
                var node_topic = xml_node.getAttribute('TEXT');
                var node_position = xml_node.getAttribute('POSITION');
                var node_direction = null;
                if(!!node_position){
                    node_direction = node_position=='left'?jm.direction.left:jm.direction.right;
                }
                _console.debug(node_position +':'+ node_direction);
                if(!!parent_id){
                    mind.add_node(parent_id, node_id, node_topic, null, null, node_direction);
                }else{
                    mind.set_root(node_id, node_topic);
                }
                var children = xml_node.childNodes;
                var child = null;
                for(var i=0;i<children.length;i++){
                    child = children[i];
                    if(child.nodeType == 1 && child.tagName == 'node'){
                        df._load_node(mind, node_id, child);
                    }
                }
            }
        },
    };

    // ============= utility object =============================================

    jm.util = {
        ajax:{
            _xhr:function(){
                var xhr = null;
                if(window.XMLHttpRequest){
                    xhr = new XMLHttpRequest();
                }else{
                    try{
                        xhr = new ActiveXObject("Microsoft.XMLHTTP");
                    }catch(e){}
                }
                return xhr;
            },
            _eurl:function(url){
                return encodeURIComponent(url);
            },
            request:function(url,param,method,callback){
                var a = jm.util.ajax;
                var p = null;
                var tmp_param = [];
                for(k in param){
                    tmp_param.push(a._eurl(k)+'='+a._eurl(param[k]));
                }
                if(tmp_param.length>0){
                    p = tmp_param.join('&');
                }
                var xhr = a._xhr();
                if(!xhr){return;}
                xhr.onreadystatechange = function(){
                    if(xhr.readyState == 4){
                        if(xhr.status == 200 || xhr.status == 0){
                            if(typeof(callback) == 'function'){
                                var data = eval('('+xhr.responseText+')');
                                callback(data);
                            }
                        }else{
                            var w = $w.open('');
                            w.document.write(xhr.responseText);
                            //alert(xhr.responseText);
                        }
                    }
                }
                method = method || 'GET';
                xhr.open(method,url,true);
                xhr.setRequestHeader('If-Modified-Since','0');
                if(method == 'POST'){
                    xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded;charset=utf-8');
                    xhr.send(p);
                }else{
                    xhr.send();
                }
            },
            get:function(url,callback){
                return jm.util.ajax.request(url,{},'GET',callback);
            },
            post:function(url,param,callback){
                return jm.util.ajax.request(url,param,'POST',callback);
            }
        },

        dom:{
            //target,eventType,handler
            add_event:function(t,e,h){
                if(!!t.addEventListener){
                    t.addEventListener(e,h,false);
                }else{
                    t.attachEvent('on'+e,h);
                }
            }
        },

        canvas:{
            easing_gauss: function(t,b,c,d){var x=t*4/d;return (1-Math.pow(Math.E,-(x*x)/2))*c+b;},
            lineto : function(ctx,x1,y1,x2,y2){
                var ztf = jm.util.canvas.easing_gauss;
                ctx.moveTo(x1,y1);
                ctx.beginPath();
                var l = x2-x1;
                var c = y1-y2;
                var absl = Math.abs(l);
                var t = 0;
                for(var t=0;t<absl+1;t++){
                    y2 = y1-ztf(t,0,c,l);
                    ctx.lineTo(t*(Math.abs(l)/l)+x1,y2);
                }
                ctx.stroke();
            },
            clear:function(ctx,x1,y1,x2,y2){
                ctx.clearRect(x1,y1,x2,y2);
            }
        },

        file:{
            read:function(file_data,fn_callback){
                var reader = new FileReader();
                reader.onload = function(){
                    if(typeof(fn_callback) == 'function'){
                        fn_callback(this.result, file_data.name);
                    }
                };
                reader.readAsText(file_data);
            },

            save:function(file_data, type, name) {
                var blob;
                if (typeof $w.Blob == "function") {
                    blob = new Blob([file_data], {type: type});
                } else {
                    var BlobBuilder = $w.BlobBuilder || $w.MozBlobBuilder || $w.WebKitBlobBuilder || $w.MSBlobBuilder;
                    var bb = new BlobBuilder();
                    bb.append(file_data);
                    blob = bb.getBlob(type);
                }
                var URL = $w.URL || $w.webkitURL;
                var bloburl = URL.createObjectURL(blob);
                var anchor = $c('a');
                if ('download' in anchor) {
                    anchor.style.visibility = "hidden";
                    anchor.href = bloburl;
                    anchor.download = name;
                    $d.body.appendChild(anchor);
                    var evt = $d.createEvent("MouseEvents");
                    evt.initEvent("click", true, true);
                    anchor.dispatchEvent(evt);
                    $d.body.removeChild(anchor);
                } else if (navigator.msSaveBlob) {
                    navigator.msSaveBlob(blob, name);
                } else {
                    location.href = bloburl;
                }
            }
        },

        json:{
            json2string:function(json){
                if(!!JSON){
                    try{
                        var json_str = JSON.stringify(json);
                        return json_str;
                    }catch(e){
                        _console.warn(e);
                        _console.warn('can not convert to string');
                        return null;
                    }
                }
            },
            string2json:function(json_str){
                if(!!JSON){
                    try{
                        var json = JSON.parse(json_str);
                        return json;
                    }catch(e){
                        _console.warn(e);
                        _console.warn('can not parse to json');
                        return null;
                    }
                }
            }
        },

        uuid:{
            newid:function(){
                var d = new Date().getTime();
                var _uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = (d + Math.random()*16)%16 | 0;
                    d = Math.floor(d/16);
                    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
                });
                return _uuid;
            }
        }
    };

    jm.prototype={
        init : function(){
            if(this._init_){return;}
            this._init_ = true;
            var opts = this.options;

            var opts_layout = {
                mode:opts.mode,
                hspace:opts.layout.hspace,
                vspace:opts.layout.vspace,
                pspace:opts.layout.pspace
            }
            var opts_view = {
                container:opts.container,
                hmargin:opts.view.hmargin,
                vmargin:opts.view.vmargin
            };
            // create instance of function provider 
            this.data = new jm.data_provider(this);
            this.layout = new jm.layout_provider(this, opts_layout);
            this.view = new jm.view_provider(this, opts_view);

            this.data.init();
            this.layout.init();
            this.view.init();

            this._event_bind();
        },

        enable_edit:function(){
            this.options.editable = true;
        },

        disable_edit:function(){
            this.options.editable = false;
        },

        get_editable:function(){
            return this.options.editable;
        },

        set_theme:function(theme){
            var theme_old = this.options.theme;
            this.options.theme = (!!theme) ? theme : null;
            if(theme_old != this.options.theme){
                this.view.reset_theme();
            }
        },

        _event_bind:function(){
            this.view.event_bind(this,null,null,this.click_handle,this.dblclick_handle);
        },

        click_handle:function(e){
            var element = e.target || e.srcElement;
            var isnode = this.view.is_node(element);
            var isexpander = this.view.is_expander(element);

            var nodeid = this.view.get_nodeid(element);
            if(isnode){
                this.select_node(nodeid);
            }else if(isexpander){
                this.toggle_node(nodeid);
            }else{
                this.select_clear();
            }
        },

        dblclick_handle:function(e){
            if(this.get_editable()){
                var element = e.target || e.srcElement;
                var isnode = this.view.is_node(element);
                if(isnode){
                    var nodeid = this.view.get_nodeid(element);
                    this.begin_edit(nodeid);
                }
            }
        },

        begin_edit:function(nodeid){
            if(this.get_editable()){
                var node = this.get_node(nodeid);
                if(!!node){
                    this.view.edit_node_begin(node);
                }else{
                    _console.error('the node[id='+nodeid+'] can not be found');
                }
            }else{
                _console.error('fail, this mind map is not editable.');
                return;
            }
        },

        end_edit:function(){
            this.view.edit_node_end();
        },

        toggle_node:function(nodeid){
            var node = this.mind.get_node(nodeid);
            if(!!node && !node.isroot){
                this.layout.toggle_node(node);
                this.view.show();
            }
        },

        expand_node:function(nodeid){
            var node = this.mind.get_node(nodeid);
            if(!!node && !node.isroot){
                this.layout.expand_node(node);
                this.view.show();
            }
        },

        collapse_node:function(nodeid){
            var node = this.mind.get_node(nodeid);
            if(!!node && !node.isroot){
                this.layout.collapse_node(node);
                this.view.show();
            }
        },

        _reset:function(){
            this.view.reset();
            this.layout.reset();
            this.data.reset();
        },

        _show:function(mind){
            var m = mind || jm.format.node_array.example;

            this.mind = this.data.load(m);
            if(!this.mind){
                _console.error('data.load error');
                return;
            }else{
                _console.debug('data.load ok');
            }

            this.view.load();
            _console.debug('view.load ok');

            this.layout.layout();
            _console.debug('layout.layout ok');

            this.view.show();
            _console.debug('view.show ok');
        },

        show : function(mind){
            if(!this._init_){
                this.init();
            }
            this._reset();
            this._show(mind);
        },

        get_meta: function(){
            return {
                name : this.mind.name,
                author : this.mind.author,
                version : this.mind.version
            };
        },

        get_data: function(data_format){
            var df = data_format || 'node_array';
            return this.data.get_data(df);
        },

        get_root:function(){
            return this.mind.root;
        },

        get_node:function(nodeid){
            return this.mind.get_node(nodeid);
        },

        add_node:function(parent_node, nodeid, topic, data){
            if(this.get_editable()){
                var node = this.mind.add_node(parent_node, nodeid, topic, data);
                if(!!node){
                    this.view.add_node(node);
                    this.layout.layout();
                    this.view.show();
                }
                return node;
            }else{
                _console.error('fail, this mind map is not editable');
                return null;
            }
        },

        insert_node_before:function(node_before, nodeid, topic, data){
            if(this.get_editable()){
                var node = this.mind.insert_node_before(node_before, nodeid, topic, data);
                if(!!node){
                    this.view.add_node(node);
                    this.layout.layout();
                    this.view.show();
                }
                return node;
            }else{
                _console.error('fail, this mind map is not editable');
                return null;
            }
        },

        insert_node_after:function(node_after, nodeid, topic, data){
            if(this.get_editable()){
                var node = this.mind.insert_node_after(node_after, nodeid, topic, data);
                if(!!node){
                    this.view.add_node(node);
                    this.layout.layout();
                    this.view.show();
                }
                return node;
            }else{
                _console.error('fail, this mind map is not editable');
                return null;
            }
        },

        remove_node:function(node){
            if(typeof node == 'string'){
                return this.remove_node(this.get_node(node));
            }
            if(this.get_editable()){
                if(!!node){
                    if(node.isroot){
                        _console.error('fail, can not remove the root node');
                        return false;
                    }
                    this.view.remove_node(node);
                    this.mind.remove_node(node);
                    this.layout.layout();
                    this.view.show();
                }else{
                    _console.error('fail, node can not be found');
                    return false;
                }
            }else{
                _console.error('fail, this mind map is not editable');
                return;
            }
        },

        update_node:function(nodeid, topic){
            if(this.get_editable()){
                var node = this.get_node(nodeid);
                if(!!node){
                    node.topic = topic;
                    this.view.update_node(node);
                    this.layout.layout();
                    this.view.show();
                }
            }else{
                _console.error('fail, this mind map is not editable');
                return;
            }
        },

        move_node:function(nodeid, beforeid){
            if(this.get_editable()){
                var node = this.mind.move_node(nodeid,beforeid);
                if(!!node){
                    this.view.update_node(node);
                    this.layout.layout();
                    this.view.show();
                }
            }else{
                _console.error('fail, this mind map is not editable');
                return;
            }
        },

        select_node:function(nodeid){
            var node = this.get_node(nodeid);
            this.mind.selected = node;
            if(!!node){
                this.view.select_node(node);
            }
        },

        get_selected_node:function(){
            if(!!this.mind){
                return this.mind.selected;
            }else{
                return null;
            }
        },

        select_clear:function(){
            if(!!this.mind){
                this.mind.selected = null;
                this.view.select_clear();
            }
        },

        resize:function(){
            this.view.resize();
        },
    };

// ============= data provider =============================================

    jm.data_provider = function(jm){
        this.jm = jm;
    };

    jm.data_provider.prototype={
        init:function(){
            _console.debug('data.init');
        },

        reset:function(){
            _console.debug('data.reset');
        },

        load:function(mind_data){
            var df = null;
            var mind = null;
            if(typeof mind_data == 'object'){
                if(!!mind_data.format){
                    df = mind_data.format;
                }else{
                    df = 'node_array';
                }
            }else{
                df = 'freemind';
            }

            if(df == 'node_array'){
                mind = jm.format.node_array.get_mind(mind_data);
            }else if(df == 'node_tree'){
                mind = jm.format.node_tree.get_mind(mind_data);
            }else if(df == 'freemind'){
                mind = jm.format.freemind.get_mind(mind_data);
            }else{
                _console.warn('unsupported format');
            }
            return mind;
        },

        get_data:function(data_format){
            var data = null;
            if(data_format == 'node_array'){
                data = jm.format.node_array.get_data(this.jm.mind);
            }else if(data_format == 'node_tree'){
                data = jm.format.node_tree.get_data(this.jm.mind);
            }else if(data_format == 'freemind'){
                data = jm.format.freemind.get_data(this.jm.mind);
            }else{
                _console.error('unsupported '+data_format+' format');
            }
            return data;
        },
    };

    // ============= layout provider ===========================================

    jm.layout_provider = function(jm, options){
        this.opts = options;
        this.jm = jm;
        this.isside = (this.opts.mode == 'side');
        this.bounds = null;

        this.cache_valid = false;
    };

    jm.layout_provider.prototype={
        init:function(){
            _console.debug('layout.init');
        },
        reset:function(){
            _console.debug('layout.reset');
            this.bounds = {n:0,s:0,w:0,e:0};
        },
        layout:function(){
            _console.debug('layout.layout');
            this.layout_direction();
            this.layout_offset();
        },

        layout_direction:function(){
            this._layout_direction_root();
        },

        _layout_direction_root:function(){
            var node = this.jm.mind.root;
            _console.debug(node);
            var layout_data = null;
            if('layout' in node._data){
                layout_data = node._data.layout;
            }else{
                layout_data = {};
                node._data.layout = layout_data;
            }
            var children = node.children;
            var children_count = children.length;
            layout_data.direction = jm.direction.center;
            layout_data.side_index = 0;
            if(this.isside){
                var i = children_count;
                while(i--){
                    this._layout_direction_side(children[i], jm.direction.right, i);
                }
            }else{
                var i = children_count;
                var subnode = null;
                while(i--){
                    subnode = children[i];
                    if(subnode.direction == jm.direction.left){
                        this._layout_direction_side(subnode,jm.direction.left, i);
                    }else{
                        this._layout_direction_side(subnode,jm.direction.right, i);
                    }
                }
                /*
                var boundary = Math.ceil(children_count/2);
                var i = children_count;
                while(i--){
                    if(i>=boundary){
                        this._layout_direction_side(children[i],jm.direction.left, children_count-i-1);
                    }else{
                        this._layout_direction_side(children[i],jm.direction.right, i);
                    }
                }*/

            }
        },

        _layout_direction_side:function(node, direction, side_index){
            var layout_data = null;
            if('layout' in node._data){
                layout_data = node._data.layout;
            }else{
                layout_data = {};
                node._data.layout = layout_data;
            }
            var children = node.children;
            var children_count = children.length;

            layout_data.direction = direction;
            layout_data.side_index = side_index;
            var i = children_count;
            while(i--){
                this._layout_direction_side(children[i], direction, i);
            }
        },

        layout_offset:function(){
            var node = this.jm.mind.root;
            var layout_data = node._data.layout;
            layout_data.offset_x = 0;
            layout_data.offset_y = 0;
            layout_data.outer_height = 0;
            var children = node.children;
            var i = children.length;
            var left_nodes = [];
            var right_nodes = [];
            var subnode = null;
            while(i--){
                subnode = children[i];
                if(subnode._data.layout.direction == jm.direction.right){
                    right_nodes.unshift(subnode);
                }else{
                    left_nodes.unshift(subnode);
                }
            }
            layout_data.left_nodes = left_nodes;
            layout_data.right_nodes = right_nodes;
            layout_data.outer_height_left = this._layout_offset_subnodes(left_nodes);
            layout_data.outer_height_right = this._layout_offset_subnodes(right_nodes);
            this.bounds.e=node._data.view.width/2;
            this.bounds.w=0-this.bounds.e;
            //_console.debug(this.bounds.w);
            this.bounds.n=0;
            this.bounds.s = Math.max(layout_data.outer_height_left,layout_data.outer_height_right);
        },

        // layout both the x and y axis
        _layout_offset_subnodes:function(nodes){
            var total_height = 0;
            var nodes_count = nodes.length;
            var i = nodes_count;
            var node = null;
            var node_outer_height = 0;
            var layout_data = null;
            var base_y = 0;
            var pd = null; // parent._data
            while(i--){
                node = nodes[i];
                layout_data = node._data.layout;
                if(pd == null){
                    pd = node.parent._data;
                }

                node_outer_height = this._layout_offset_subnodes(node.children);
                if(('isexpand' in layout_data) && !layout_data.isexpand){
                    node_outer_height=0;
                }
                node_outer_height = Math.max(node._data.view.height,node_outer_height);

                layout_data.outer_height = node_outer_height;
                layout_data.offset_y = base_y - node_outer_height/2;
                layout_data.offset_x = this.opts.hspace * layout_data.direction + pd.view.width * (pd.layout.direction + layout_data.direction)/2;
                if(!node.parent.isroot){
                    layout_data.offset_x += this.opts.pspace * layout_data.direction;
                }

                base_y = base_y - node_outer_height - this.opts.vspace;
                total_height += node_outer_height;
            }
            if(nodes_count>1){
                total_height += this.opts.vspace * (nodes_count-1);
            }
            i = nodes_count;
            var middle_height = total_height/2;
            while(i--){
                node = nodes[i];
                node._data.layout.offset_y += middle_height;
                //_console.debug(node._data.layout.offset_y);
            }
            return total_height;
        },

        // layout the y axis only, for collapse/expand a node
        _layout_offset_subnodes_height:function(nodes){
            return this._layout_offset_subnodes(nodes);
            var total_height = 0;
            var nodes_count = nodes.length;
            var i = nodes_count;
            var node = null;
            var node_outer_height = 0;
            var layout_data = null;
            var base_y = 0;
            var pd = null; // parent._data
            while(i--){
                node = nodes[i];
                layout_data = node._data.layout;
                if(pd == null){
                    pd = node.parent._data;
                }

                node_outer_height = this._layout_offset_subnodes_height(node.children);
                if(('isexpand' in layout_data) && !layout_data.isexpand){
                    node_outer_height=0;
                }
                node_outer_height = Math.max(node._data.view.height,node_outer_height);

                layout_data.outer_height = node_outer_height;
                layout_data.offset_y = base_y - node_outer_height/2;
                base_y = base_y - node_outer_height - this.opts.vspace;
                total_height += node_outer_height;
            }
            if(nodes_count>1){
                total_height += this.opts.vspace * (nodes_count-1);
            }
            i = nodes_count;
            var middle_height = total_height/2;
            while(i--){
                node = nodes[i];
                node._data.layout.offset_y += middle_height;
                //_console.debug(node.topic);
                //_console.debug(node._data.layout.offset_y);
            }
            return total_height;
        },

        get_node_offset:function(node){
            var layout_data = node._data.layout;
            var offset_cache = null;
            if(('_offset_' in layout_data) && this.cache_valid){
                offset_cache = layout_data._offset_;
            }else{
                offset_cache = {x:-1, y:-1};
                layout_data._offset_ = offset_cache;
            }
            if(offset_cache.x == -1 || offset_cache.y == -1){
                var x = layout_data.offset_x;
                var y = layout_data.offset_y;
                if(!node.isroot){
                    var offset_p = this.get_node_offset(node.parent);
                    x += offset_p.x;
                    y += offset_p.y;
                }
                offset_cache.x = x;
                offset_cache.y = y;
            }
            return offset_cache;
        },

        get_node_point:function(node){
            var view_data = node._data.view;
            var offset_p = this.get_node_offset(node);
            //_console.debug(offset_p);
            var p = {};
            p.x = offset_p.x + view_data.width*(node._data.layout.direction-1)/2;
            p.y = offset_p.y-view_data.height/2;
            //_console.debug(p);
            return p;
        },

        get_node_point_in:function(node){
            var p = this.get_node_offset(node);
            return p;
        },

        get_node_point_out:function(node){
            var layout_data = node._data.layout;
            var pout_cache = null;
            if(('_pout_' in layout_data) && this.cache_valid){
                pout_cache = layout_data._pout_;
            }else{
                pout_cache = {x:-1, y:-1};
                layout_data._pout_ = pout_cache;
            }
            if(pout_cache.x == -1 || pout_cache.y == -1){
                if(node.isroot){
                    pout_cache.x = 0;
                    pout_cache.y = 0;
                }else{
                    var view_data = node._data.view;
                    var offset_p = this.get_node_offset(node);
                    pout_cache.x = offset_p.x + (view_data.width+this.opts.pspace)*node._data.layout.direction;
                    pout_cache.y = offset_p.y;
                    //_console.debug('pout');
                    //_console.debug(pout_cache);
                }
            }
            return pout_cache;
        },

        get_expander_point:function(node){
            var p = this.get_node_point_out(node);
            var ex_p = {};
            if(node._data.layout.direction == jm.direction.right){
                ex_p.x = p.x - this.opts.pspace;
            }else{
                ex_p.x = p.x;
            }
            ex_p.y = p.y - Math.ceil(this.opts.pspace/2);
            return ex_p;
        },

        get_min_size:function(){
            var nodes = this.jm.mind.nodes;
            var node = null;
            var pout = null;
            for(var nodeid in nodes){
                node = nodes[nodeid];
                pout = this.get_node_point_out(node);
                //_console.debug(pout.x);
                if(pout.x > this.bounds.e){this.bounds.e = pout.x;}
                if(pout.x < this.bounds.w){this.bounds.w = pout.x;}
            }
            return {
                w:this.bounds.e - this.bounds.w,
                h:this.bounds.s - this.bounds.n
            }
        },

        toggle_node:function(node){
            if(node.isroot){
                return;
            }
            var layout_data = node._data.layout;
            var isexpand = true;
            if('isexpand' in layout_data){
                isexpand = layout_data.isexpand;
            }
            if(isexpand){
                this.collapse_node(node);
            }else{
                this.expand_node(node);
            }
        },

        expand_node:function(node){
            //_console.debug('expand');
            node._data.layout.isexpand = true;
            this.part_layout(node);
            this.set_visible(node.children,true);
        },

        collapse_node:function(node){
            //_console.debug('collapse');
            node._data.layout.isexpand = false;
            this.part_layout(node);
            this.set_visible(node.children,false);
        },

        part_layout:function(node){
            //_console.debug('part_layout');
            var root = this.jm.mind.root;
            if(!!root){
                var root_layout_data = root._data.layout;
                if(node._data.layout.direction == jm.direction.right){
                    root_layout_data.outer_height_right=this._layout_offset_subnodes_height(root_layout_data.right_nodes);
                }else{
                    root_layout_data.outer_height_left=this._layout_offset_subnodes_height(root_layout_data.left_nodes);
                }
                this.bounds.s = Math.max(root_layout_data.outer_height_left,root_layout_data.outer_height_right);
                this.cache_valid = false;
            }else{
                _console.warn('can not found root node');
            }
        },

        set_visible:function(nodes,visible){
            var i = nodes.length;
            var node = null;
            var layout_data = null;
            while(i--){
                node = nodes[i];
                layout_data = node._data.layout;
                if(('isexpand' in layout_data) && !layout_data.isexpand){
                    this.set_visible(node.children,false);
                }else{
                    this.set_visible(node.children,visible);
                }
                node._data.layout.visible = visible;
            }
        },

        is_expand:function(node){
            var layout_data = node._data.layout;
            if(('isexpand' in layout_data) && !layout_data.isexpand){
                return false;
            }else{
                return true;
            }
        },
        
        is_visible:function(node){
            var layout_data = node._data.layout;
            if(('visible' in layout_data) && !layout_data.visible){
                return false;
            }else{
                return true;
            }
        },
    };

    // view provider
    jm.view_provider= function(jm, options){
        this.opts = options;
        this.jm = jm;
        this.layout = jm.layout;

        this.container = null;
        this.e_panel = null;
        this.e_nodes= null;
        this.e_canvas = null;

        this.canvas_ctx = null;
        this.size = {w:0,h:0};

        this.selected_node = null;
        this.editing_node = null;
    };

    jm.view_provider.prototype={
        init:function(){
            _console.debug('view.init');

            this.container = $g(this.opts.container);
            if(!this.container){
                _console.error('the options.view.container was not be found in dom');
                return;
            }
            this.e_panel = $c('div');
            this.e_canvas = $c('canvas');
            this.e_nodes = $c('jmnodes');
            this.e_editor = $c('input');

            this.e_panel.className = 'jsmind-inner';
            this.e_panel.appendChild(this.e_canvas);
            this.e_panel.appendChild(this.e_nodes);

            this.e_editor.className = 'jsmind-editor';
            this.e_editor.type = 'text';

            var v = this;
            jm.util.dom.add_event(this.e_editor,'keydown',function(e){
                if(e.keyCode == 13){v.edit_node_end();}
            });
            jm.util.dom.add_event(this.e_editor,'blur',function(e){
                v.edit_node_end();
            });

            this.container.appendChild(this.e_panel);

            this.init_canvas();
        },
            
        event_bind:function(obj,fn_mouseover,fn_mouseout,fn_click,fn_dblclick){
            if(!!fn_mouseover){
                jm.util.dom.add_event(this.e_nodes,'mouseover',function(e){fn_mouseover.call(obj,e);});
            }
            if(!!fn_mouseout){
                jm.util.dom.add_event(this.e_nodes,'mouseout',function(e){fn_mouseout.call(obj,e);});
            }
            if(!!fn_click){
                jm.util.dom.add_event(this.e_nodes,'click',function(e){fn_click.call(obj,e);});
            }
            if(!!fn_dblclick){
                jm.util.dom.add_event(this.e_nodes,'dblclick',function(e){fn_dblclick.call(obj,e);});
            }
        },

        get_nodeid:function(element){
            return element.getAttribute('nodeid');
        },

        is_node:function(element){
            return (element.tagName.toLowerCase() == 'jmnode');
        },

        is_expander:function(element){
            return (element.tagName.toLowerCase() == 'jmexpander');
        },

        reset:function(){
            _console.debug('view.reset');
            this.selected_node = null;
            this.clear_lines();
            this.clear_nodes();
            this.reset_theme();
        },

        reset_theme:function(){
            var theme_name = this.jm.options.theme;
            if(!!theme_name){
                this.e_nodes.className = theme_name;
            }else{
                this.e_nodes.className = '';
            }
        },

        load:function(){
            _console.debug('view.load');
            this.init_nodes();
        },

        expand_size:function(){
            var min_size = this.layout.get_min_size();
            var min_width = min_size.w + this.opts.hmargin*2;
            var min_height = min_size.h + this.opts.vmargin*2;
            var client_w = this.e_panel.clientWidth;
            var client_h = this.e_panel.clientHeight;
            if(client_w < min_width){client_w = min_width;}
            if(client_h < min_height){client_h = min_height;}
            this.size.w = client_w;
            this.size.h = client_h;
        },

        init_canvas:function(){
            var ctx = this.e_canvas.getContext('2d');
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            this.canvas_ctx = ctx;
        },

        init_nodes:function(){
            var nodes = this.jm.mind.nodes;
            for(var nodeid in nodes){
                this.create_node_element(nodes[nodeid]);
            }
        },

        add_node:function(node){
            this.create_node_element(node);
        },

        create_node_element:function(node){
            var view_data = null;
            if('view' in node._data){
                view_data = node._data.view;
            }else{
                view_data = {};
                node._data.view = view_data;
            }

            var d = $c('jmnode');
            if(node.isroot){
                d.className = 'root';
            }else{
                var d_e = $c('jmexpander');
                $t(d_e,'-');
                d_e.setAttribute('nodeid',node.id);
                d_e.style.visibility = 'hidden';
                this.e_nodes.appendChild(d_e);
                view_data.expander = d_e;
            }
            $t(d,node.topic);
            d.setAttribute('nodeid',node.id);
            d.style.visibility='hidden';
            this.e_nodes.appendChild(d);
            view_data.element = d;
            view_data.width = d.clientWidth;
            view_data.height = d.clientHeight;
        },

        remove_node:function(node){
            if(this.selected_node != null && this.selected_node.id == node.id){
                this.selected_node = null;
            }
            if(this.editing_node != null && this.editing_node.id == node.id){
                node._data.view.element.removeChild(this.e_editor);
                this.editing_node = null;
            }
            var children = node.children;
            var i = children.length;
            while(i--){
                this.remove_node(children[i]);
            }
            if(node._data.view){
                var element = node._data.view.element;
                var expander = node._data.view.expander;
                this.e_nodes.removeChild(element);
                this.e_nodes.removeChild(expander);
                node._data.view.element = null;
                node._data.view.expander = null;
            }
        },

        update_node:function(node){
            var view_data = node._data.view;
            var element = view_data.element;
            $t(element,node.topic);
            view_data.width = element.clientWidth;
            view_data.height = element.clientHeight;
        },

        select_node:function(node){
            if(!!this.selected_node){
                this.selected_node._data.view.element.className =
                this.selected_node._data.view.element.className.replace(/\s*selected\s*/i,'');
            }
            if(!!node){
                this.selected_node = node;
                node._data.view.element.className += ' selected';
            }
        },

        select_clear:function(){
            this.select_node(null);
        },

        edit_node_begin:function(node){
            if(this.editing_node != null){
                this.edit_node_end();
            }
            this.editing_node = node;
            var view_data = node._data.view;
            var element = view_data.element;
            var topic = node.topic;
            this.e_editor.value = topic;
            element.innerHTML = '';
            element.appendChild(this.e_editor);
            element.style.zIndex = 5;
            this.e_editor.focus();
            this.e_editor.select();
        },

        edit_node_end:function(){
            if(this.editing_node != null){
                var node = this.editing_node;
                this.editing_node = null;
                var view_data = node._data.view;
                var element = view_data.element;
                var topic = this.e_editor.value;
                element.style.zIndex = 'auto';
                element.removeChild(this.e_editor);
                this.jm.update_node(node.id,topic,node.summary);
            }
        },

        get_view_offset:function(){
            var bounds = this.layout.bounds;
            var _x = (this.size.w - bounds.e - bounds.w)/2;
            var _y = this.size.h / 2;
            return{x:_x, y:_y};
        },

        resize:function(){
            this.e_canvas.width = 1;
            this.e_canvas.height = 1;
            this.e_nodes.style.width = '1px';
            this.e_nodes.style.height = '1px';

            this.expand_size();
            this._show();
        },

        _show:function(){
            this.e_canvas.width = this.size.w;
            this.e_canvas.height = this.size.h;
            this.e_nodes.style.width = this.size.w+'px';
            this.e_nodes.style.height = this.size.h+'px';
            this.show_nodes();
            this.show_lines();

            // center root node
            var outer_w = this.e_panel.clientWidth;
            var outer_h = this.e_panel.clientHeight;
            if(this.size.w > outer_w){
                var _offset = this.get_view_offset();
                this.e_panel.scrollLeft = _offset.x - outer_w/2;
            }
            if(this.size.h > outer_h){
                this.e_panel.scrollTop = (this.size.h - outer_h)/2;
            }
            //this.layout.cache_valid = true;
        },

        show:function(){
            _console.debug('view.show');
            this.expand_size();
            this._show();
        },

        clear_nodes:function(){
            var mind = this.jm.mind;
            if(mind == null){
                return;
            }
            var nodes = mind.nodes;
            var node = null;
            for(var nodeid in nodes){
                node = nodes[nodeid];
                node._data.view.element = null;
                node._data.view.expander = null;
            }
            this.e_nodes.innerHTML = '';
        },

        show_nodes:function(){
            var nodes = this.jm.mind.nodes;
            var node = null;
            var node_element = null;
            var expander = null;
            var p = null;
            var p_expander= null;
            var expander_text = '-';
            var _offset = this.get_view_offset();
            for(var nodeid in nodes){
                node = nodes[nodeid];
                node_element = node._data.view.element;
                expander = node._data.view.expander;
                if(!this.layout.is_visible(node)){
                    node_element.style.display = 'none';
                    expander.style.display = 'none';
                    continue;
                }
                p = this.layout.get_node_point(node);
                node_element.style.left = (_offset.x+p.x) + 'px';
                node_element.style.top = (_offset.y+p.y) + 'px';
                node_element.style.display = '';
                node_element.style.visibility = 'visible';
                if(!node.isroot && node.children.length>0){
                    expander_text = this.layout.is_expand(node)?'-':'+';
                    p_expander= this.layout.get_expander_point(node);
                    expander.style.left = (_offset.x + p_expander.x) + 'px';
                    expander.style.top = (_offset.y + p_expander.y) + 'px';
                    expander.style.display = '';
                    expander.style.visibility = 'visible';
                    $t(expander,expander_text);
                }
            }
        },

        clear_lines:function(){
            jm.util.canvas.clear(this.canvas_ctx,0,0,this.size.w,this.size.h);
        },

        show_lines:function(){
            this.clear_lines();
            var nodes = this.jm.mind.nodes;
            var node = null;
            var pin = null;
            var pout = null;
            var _offset = this.get_view_offset();
            for(var nodeid in nodes){
                node = nodes[nodeid];
                if(!!node.isroot){continue;}
                if(('visible' in node._data.layout) && !node._data.layout.visible){continue;}
                pin = this.layout.get_node_point_in(node);
                pout = this.layout.get_node_point_out(node.parent);
                this.draw_line(pout,pin,_offset);
            }
        },

        draw_line:function(pin,pout,offset){
            jm.util.canvas.lineto(
                this.canvas_ctx,
                pin.x + offset.x,
                pin.y + offset.y,
                pout.x + offset.x,
                pout.y + offset.y);
        }
    };


    jm.show = function(options,mind,data_format){
        var _jm = new jm(options);
        _jm.show(mind,data_format);
        return _jm;
    };

    // register global variables
    $w[__name__] = jm;
})(window);

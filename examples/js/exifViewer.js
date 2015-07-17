  var init = function() {

    $('input[type=file]').bootstrapFileInput();
    $('.file-inputs').bootstrapFileInput();

    var dropbox = document.getElementById('dropbox');
    var canvas = document.getElementById('exifCanvas');
    var loadedFile;
    var rotation = 0;

    var downloadSampleImage = function() {
      var request = new XMLHttpRequest();
      request.open("GET", "/exif-parser/examples/images/sample.jpg", true);
      request.responseType = "arraybuffer";

      request.onload = function (event) {
        var arrayBuffer = request.response; // Note: not request.responseText
        var blob = new Blob([arrayBuffer],{type: "image/jpeg"});
        renderFile(blob);
      };
      var dropLabel = document.getElementById('dropLabel');
      dropLabel.innerHTML = 'Loading file...';
      request.send(null);
    };

    document.getElementById('downloadSampleImage').onclick = downloadSampleImage;
    document.getElementById('downloadSampleImage').style.cursor = 'pointer';

    var noopHandler = function(evt) {
     evt.stopPropagation();
     evt.preventDefault();
    };

    var drop = function(evt) {
     var files = evt.dataTransfer.files;
     var count = files.length;
     evt.stopPropagation();
     evt.preventDefault();
     // Only call the handler if 1 or more files are dropped.
     if (count > 0) {
       document.getElementById("dropLabel").innerHTML = "Processing " + files[0].name;
       renderFile(files[0]);
      }
    };

    var resetThumbnail = function() {
      var thumbnailContainer = document.getElementById('thumbnailContainer');
      thumbnailContainer.style.display = 'none';
    };

    var resetMetaData = function() {
      var exifTagsTable = document.getElementById('exifTags');
      exifTagsTable.innerHTML = "";
      document.getElementById('dropLabel').style.display = 'inline-block';
    }

    var renderThumbnail = function(thumbnailBlob, rotation) {
      var thumbnail = document.getElementById('thumbnail');
      var thumbnailContainer = document.getElementById('thumbnailContainer');
      thumbnail.src = URL.createObjectURL(thumbnailBlob);
      thumbnailContainer.style.display = 'block';
      thumbnail.onload = function(event) {
        var height;
        var imageElement = event.srcElement || event.target;
        var height = Math.max(imageElement.height,imageElement.width);
        thumbnailContainer.style.height = height + "px";
        thumbnailContainer.style.width =  height + "px";
      }
      if (rotation) {
        thumbnail.style["-webkit-transform"] = "none";
        thumbnail.style["-webkit-transform"] = "rotate(" + rotation + "deg)";
        thumbnail.style["transform"] = "rotate(" + rotation + "deg)";
        thumbnail.style["margin"] = "45px 0px 45px 0px";
      }
    }

    var renderTag = function(label, value) {
      var tagsTable = document.getElementById('exifTags');
      var tagRow = document.createElement('tr');
      var tagLabel = document.createElement('td');
      var tagValue = document.createElement('td');
      var valueText = document.createElement('span');
      var numerator;
      valueText.id = label + "Value";
      tagLabel.innerHTML = label;
      tagLabel.classList.add('exifLabel');
      tagValue.classList.add('exifValue');
      if (value instanceof Array) {
        value = value.toString();
      } else if (typeof value === "object") {
        denominator = value.denominator || 1;
        value = value.numerator / denominator;
      }
      valueText.innerHTML = value;
      valueText.style.display = 'inline-block';
      valueText.style['minWidth'] = '20px';
      tagValue.appendChild(valueText);
      tagRow.appendChild(tagLabel);
      tagRow.appendChild(tagValue);
      tagsTable.appendChild(tagRow);
      return tagValue;
    };

    var displayMetaData = function(metaData){
      var tag;
      var tagsTable = document.getElementById('exifTags');
      var orientationTagRow;
      var rotationIcon = document.createElement('i');
      var okIcon = document.createElement('i');
      var rotateButton = document.createElement('a');
      var saveButton = document.querySelector('#saveButton');
      saveButton.onclick = saveFile;
      document.getElementById('dropLabel').style.display = 'none';
      tagsTable.innerHTML = "";
      if (metaData.UserComment) {
        pictureTags = metaData.UserComment.split(' ');
      } else {
        pictureTags = [];
      }
      renderTags(pictureTags);
      metaData.UserComment = undefined;
      if (metaData.Orientation) {
        orientationTagValue = renderTag("Orientation", metaData.Orientation);
        rotationIcon.classList.add('icon-rotate-right');
        okIcon.classList.add('icon-ok');
        rotateButton.classList.add('btn', 'btn-default');
        rotateButton.appendChild(rotationIcon);
        rotateButton.innerHTML += " Rotate";
        rotateButton.style.margin = "0px 0px 5px 30px";
        rotateButton.onclick = rotateRight;
        orientationTagValue.appendChild(rotateButton);
      }
      for (tag in metaData) {
        if (metaData.hasOwnProperty(tag) && metaData[tag] !== undefined) {
          if (tag === "Orientation") {
            continue;
          }
          renderTag(tag, metaData[tag]);
        }
      }
    };

    var TemplateEngine = function(html, options) {
        var re = /<%([^%>]+)?%>/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];\n', cursor = 0;
        var add = function(line, js) {
            js? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
                (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
            return add;
        }
        while(match = re.exec(html)) {
            add(html.slice(cursor, match.index))(match[1], true);
            cursor = match.index + match[0].length;
        }
        add(html.substr(cursor, html.length - cursor));
        code += 'return r.join("");';
        return new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
    }

    var pictureTags = [];

    var tagTemplate = '<div class="tag label btn-info md"><span><%this.name%></span><a style="opacity: 0.6;" data-tag="<%this.name%>"><i class="remove glyphicon glyphicon-remove-sign glyphicon-white"></i></a>  </div>';

    var removeTag = function(el) {
      var tag = el.target.parentElement.getAttribute('data-tag');
      var i;
      for (i = 0; i < pictureTags.length; ++i) {
        if (pictureTags[i] === tag) {
          pictureTags.splice(i, 1);
          renderTags(pictureTags);
          return;
        }
      }
    };

    var renderTags = function(pictureTags) {
      var tagsList = document.querySelector('#tags');
      var tagInput = document.querySelector('#tagInput');
      var inputPadding = 0;
      if (!tagsList) {
        tagsContainer = document.createElement('div');
        tagsContainer.classList.add('bootstrap-tags', 'bootstrap-3');
        var tagsList = document.createElement('div');
        tagsList.classList.add('tags');
        tagsList.id = "tags";
        tagsContainer.appendChild(tagsList);
        var tagsInput =
        '<input id="tagInput" style="padding-left: 135px; padding-top: 0px; width: 213.75px;' +
        ' placeholder="" class="form-control tags-input input-lg" type="text">';
        tagsContainer.innerHTML += tagsInput;
        renderTag('Tags', tagsContainer.outerHTML);
        tagsList = document.querySelector('#tags');
        tagInput = document.querySelector('#tagInput');
        tagInput.onkeypress = function(e){
          if (!e) e = window.event;
          var keyCode = e.keyCode || e.which;
          if (keyCode == '13'){
            pictureTags.push(tagInput.value);
            renderTags(pictureTags);
            tagInput.value = '';
            return false;
          }
        }
      }
      tagsList.innerHTML = "";
      pictureTags.forEach(function(tag) {
        inputPadding += 35 + tag.length * 8;
        tagsList.innerHTML += TemplateEngine(tagTemplate, {
          name: tag
        });
      });
      tagInput.style.paddingLeft = inputPadding + 'px';
      var tagRemoveButtons = document.querySelectorAll('.bootstrap-tags.bootstrap-3 .tag a');
      for (var i = 0; i < tagRemoveButtons.length; ++ i) {
        tagRemoveButtons[i].onclick = removeTag;
      }
    };

    var renderFile = function(file){
      var dropLabel = document.getElementById('dropLabel');
      dropLabel.innerHTML = 'Loading file...';
      loadedFile = file;
      JPEG.readMetaData(file, file.size, function(error, metaData) {
        resetMetaData();
        if (error) {
          dropLabel.innerHTML = error;
          dropLabel.style.color = "red";
        } else {
          loadedImageMetaData = metaData.Exif || metaData.JFIF
          displayMetaData(loadedImageMetaData);
        }
        resetThumbnail();
        if (metaData.thumbnailBlob) {
          renderThumbnail(metaData.thumbnailBlob, JPEG.exifSpec.orientationDegrees[loadedImageMetaData.Orientation]);
        }
      });
    };

    var saveFile = function() {
      if (!loadedFile) {
        return;
      }
      JPEG.writeExifMetaData(loadedFile,
        {
          "Orientation": loadedImageMetaData.Orientation,
          "UserComment": pictureTags.join(' ')
        },
        function(error, blob) {
          saveAs(blob, "test.jpg");
      });
    }

    var rotateRight = function() {
      var height;
      var thumbnail = document.getElementById('thumbnail');
      var orientationValue = document.getElementById('OrientationValue');
      rotation += 90;
      thumbnail.style["-webkit-transform"] = 'rotate(' + rotation  +'deg)';
      thumbnail.style["transform"] = 'rotate(' + rotation  +'deg)';
      loadedImageMetaData.Orientation = JPEG.exifSpec.rotateImage(loadedImageMetaData.Orientation, 90);
      // if (rotation % 360 === 90 || rotation % 360 === 270) {
      //     thumbnail.style.position = "relative";
      //     thumbnail.style.bottom = "0";
      // } else {
      //   thumbnail.style.position = "static";
      // }
      orientationValue.innerHTML = loadedImageMetaData.Orientation;
    };

    dropbox.addEventListener("dragenter", noopHandler, false);
    dropbox.addEventListener("dragexit", noopHandler, false);
    dropbox.addEventListener("dragover", noopHandler, false);
    dropbox.addEventListener("drop", drop, false);
  };

  $(window).load(init);


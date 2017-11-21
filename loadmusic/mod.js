var modDir = "assets/mods/loadmusic/";
var fs = require('fs');
Object.entries = Object.entries || function(obj) {
    var pairs = []
    for (var i in obj) {
        pairs.push([i, obj[i]])
    }
    return pairs
};
Object.rename = function(obj, oldName, newName) {
    if (obj[oldName]) {
        obj[newName] = obj[oldName]
        delete obj[oldName]
    }
}

function loadCustomMusic() {
    var musicData = JSON.parse(fs.readFileSync(modDir + "cm.db", "utf8"));
    var musicKeys = Object.entries(cc.ig.bgm.varNames);
    musicKeys.forEach(function(element) {
        for (var i in musicData) {
            Object.rename(musicData[i], element[0], element[1])
        }
    })
    ig.merge(cc.ig.BGM_TRACK_LIST, musicData);
};

function loadCustomTrackConfig() {
    var mapMusicData = JSON.parse(fs.readFileSync(modDir + "mm.db", "utf8"));
    for (var mapName in mapMusicData) {
        var mapBGMData = mapMusicData[mapName];
        for (var themeType in mapBGMData) {
            Object.rename(mapBGMData[themeType], "name", cc.ig.varNames.BGMpath)
        }
    }
    ig.merge(cc.ig.bgm.mapConfig, mapMusicData);
};
loadCustomMusic()
loadCustomTrackConfig()

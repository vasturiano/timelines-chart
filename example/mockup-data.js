function getMockupData() {

    var NGROUPS = 6;
    var MAXLINES = 15;
    var MAXSEGMENTS = 20;
    var MINTIME = new Date(2013,2,21);

    function getGroupData() {

        function getSegmentsData() {

            var segData=[];

            var nSegments = Math.ceil(Math.random()*MAXSEGMENTS);
            var segMaxLength = Math.round(((new Date())-MINTIME)/nSegments);
            var runLength = MINTIME;

            for (var i=0; i< nSegments; i++) {
                var tDivide = [Math.random(), Math.random()].sort();
                var start = new Date(runLength.getTime() + tDivide[0]*segMaxLength);
                var end = new Date(runLength.getTime() + tDivide[1]*segMaxLength);
                runLength = new Date(runLength.getTime() + segMaxLength);
                segData.push({
                    'timeRange': [start, end],
                    'val': Math.random()
                    //'labelVal': is optional - only displayed in the labels
                });
            }

            return segData;

        }

        var grpData = [];

        for (var i=0, nLines=Math.ceil(Math.random()*MAXLINES); i<nLines; i++) {
            grpData.push({
                'label': 'label' + (i+1),
                'data': getSegmentsData()
            });
        }
        return grpData;
    }

    var data = [];

    for (var i=0; i< NGROUPS; i++) {
        data.push({
            'group': 'group' + (i+1),
            'data': getGroupData()
        });
    }

    return data;
}
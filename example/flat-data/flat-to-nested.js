function flatTOnested(nDATA) {

    var MAXCATEGORIES = 20
    var categoryLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    var nCategories = Math.ceil(Math.random()*MAXCATEGORIES)
    var myData = [];
 
    var gps = nDATA.map(function (d) { return d.group; })
                                  .reduce(function (p, v) { return p.indexOf(v) == -1 ? p.concat(v) : p; }, [])
                                  .filter(function (d) { return (typeof d !== "undefined") ? d !== null : false });
    var i = 0
    gps.forEach(function (gp) {

        var datar = nDATA.filter(function (d) { return d.group === gp; });
       
        var group = {
            "group": gp,
            "data": []
        }

        myData.push(group)

        var labels = datar.map(function (d) { return d.label; })
                     .reduce(function (p, v) { return p.indexOf(v) == -1 ? p.concat(v) : p; }, [])
                     .filter(function (d) { return (typeof d !== "undefined") ? d !== null : false });

        var ii = 0
        labels.forEach(function (lab) {

            var sublab = datar.filter(function (d) { return d.label === lab; });

            var lvl2 = {
                "label": lab,
                "data": []
            }

            myData[i].data.push(lvl2)

            for (var j = 0, jlen = sublab.length; j < jlen; j++) {
  
                var lvl3 = {
                    "timeRange": [],
                    "val": categoryLabels[Math.ceil(Math.random() * nCategories)]
                }

                myData[i].data[ii].data.push(lvl3)

                var start = sublab[j].start
                var finish = sublab[j].finish

                var lvl4 = start

                myData[i].data[ii].data[j].timeRange.push(lvl4)

                var lvl4 = finish

                myData[i].data[ii].data[j].timeRange.push(lvl4)
               
            }

            ii++
        })

        i++
    });

    return myData
}
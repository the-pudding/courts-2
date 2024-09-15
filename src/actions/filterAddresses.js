import { point, pointsWithinPolygon, bboxPolygon } from "@turf/turf";

export default function filterLocation(courts,location,filterType) {
    console.log(location)
    if(filterType == "bbox"){
        let locationBbox = location.result.bbox;
        let polygonToSearch = bboxPolygon(locationBbox);

        let pointArray = courts.map(d => {
            return point(d.center.split(","),{id:d.id})
            return d
        });

        pointArray = {
            "type":"FeatureCollection",
            "features":pointArray
        };

        // console.log(pointArray)
        // console.log(polygonToSearch)

        let ptsWithin = pointsWithinPolygon(pointArray, polygonToSearch).features.map(d => {
            return d.properties.id;
        });
                
        return ptsWithin;
    }
}
import { point, points, polygon, pointsWithinPolygon, bboxPolygon } from "@turf/turf";
import courts from "$data/courts_positions.csv"

// import { points } from "@turf/turf";

// import { polygon, center, bearing, distance, point } from '@turf/turf';

export default function filterLocation(data,location,filterType) {

    if(filterType == "bbox"){
        console.log(location)
        let locationBbox = location.result.bbox;
        let polygonToSearch = bboxPolygon(locationBbox);

        let pointArray = courts.map(d => {

            //lng lat
            return point(d.center.split(","),{id:d.id})
            // return d.center.split(",")//
            return d
        });

        pointArray = {
            "type":"FeatureCollection",
            "features":pointArray
        };

        console.log(pointArray)
        console.log(polygonToSearch)

        let ptsWithin = pointsWithinPolygon(pointArray, polygonToSearch).features.map(d => {
            return +d.properties.id;
        });

    
        
        return ptsWithin;
    }
}
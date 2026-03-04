close all; clear all;

load('C:\Users\Philip\Documents\Projects\Ephemr\MATLAB\MATLAB_DATA\1000cities.mat')

%{
const MAJOR_CITIES = [ { name: 'Tokyo', lat: 35.6762, lon: 139.6503 }, { name: 'Delhi', lat: 28.7041, lon: 77.1025 }, ];
%}
iCount = 0;
for i = 1:height(Cities)
    cName = sprintf("%s, %s",Cities.NameOfCity(i), Cities.Country(i));
    name = sprintf("%s",Cities.NameOfCity(i));
    if contains(name, "'")
        name =  strrep(name,"'", "\'");
    end
    lat = sprintf('%.4f', Cities.Latitude(i));
    lon = sprintf('%.4f', Cities.Longitude(i));
    
    if contains(cName, 'China') ||contains(cName, 'Russia') || contains(cName, 'India')
        iCount = iCount +1 ;
        continue;
    end
    fprintf("{ name: '%s', lat: %s, lon: %s },\n", name, lat, lon);
    
end
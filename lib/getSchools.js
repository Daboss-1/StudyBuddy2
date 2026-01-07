export async function getSchools(name) {
    const response = await fetch("/api/get-schools", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
    body: JSON.stringify({schoolName: name})
    })
    const data = await response.json();
    const schools = [];
    for (let key in data) {
        schools.push(data[key][0]);
    }
    console.log("Schools fetched:", schools);
    return schools || [];
}
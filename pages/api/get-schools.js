export default async function handler(req, res) {
    const { schoolName } = req.body;
    
    if (!schoolName) {
        return res.status(400).json({ message: 'School name is required' });
    }
    try {
        const response = await fetch(`https://high-schools.com/autocomplete.php?type=schools&q=${encodeURIComponent(schoolName)}`);
        if (!response.ok) {
            return res.status(response.status).json({ message: 'Failed to fetch schools' });
        }
        const data = await response.json();
        data.fetchUrl = `https://high-schools.com/autocomplete.php?type=schools&q=${encodeURIComponent(schoolName)}`;
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching schools:', error);
        return res.status(500).json({ message: 'Failed to fetch schools' });
    }
}
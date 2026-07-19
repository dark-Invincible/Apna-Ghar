export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Handle parameters from query (GET) or body (POST)
  const data = request.method === 'POST' ? request.body : request.query;
  const khasra = (data.khasra || '').trim();
  const khata = (data.khata || '').trim();
  const village = (data.village || '').trim();
  const tehsil = (data.tehsil || '').trim();

  if (!khasra && !khata) {
    return response.status(400).json({ error: 'Either Khasra or Khata number is required.' });
  }

  // Pre-configured mock database for Prayagraj plots
  const mockDatabase = [
    {
      khasra: '142/3A',
      khata: '556',
      village: 'Civil Lines',
      tehsil: 'Sadar',
      ownerName: 'Rajesh Kumar Bind',
      lastMutationDate: '2024-04-12',
      disputeFound: false,
      legalReviewRecommended: true,
      legalReviewReason: 'Plot mutation is clear on Bhulekh. However, a local sub-registrar office search is highly recommended because of pending public road easement disputes in Civil Lines.',
      missingDocuments: ['Sajra Map (Village Plot Layout)', '1359 Fasli Khatauni (Historical Land Records)', 'Non-Encumbrance Certificate (Form 15)']
    },
    {
      khasra: '88/2',
      khata: '210',
      village: 'Katra',
      tehsil: 'Sadar',
      ownerName: 'Sushila Devi Malviya',
      lastMutationDate: '2021-09-30',
      disputeFound: false,
      legalReviewRecommended: false,
      legalReviewReason: 'Clean record history in state Bhulekh portal. Standard survey matching completed.',
      missingDocuments: ['Registered Sale Deed Draft', 'Latest Mutation Order (Dakhil Kharij)']
    },
    {
      khasra: '405',
      khata: '99',
      village: 'Naini',
      tehsil: 'Karchhana',
      ownerName: 'Ram Chandra Prasad',
      lastMutationDate: '2015-05-18',
      disputeFound: true,
      legalReviewRecommended: true,
      legalReviewReason: 'Active partition suit registered in Prayagraj civil courts (Case ref: 812/2018). Mutation is locked. Do not proceed without a comprehensive title certificate.',
      missingDocuments: ['Court Decree copy', 'Registered Partition Deed', 'Sajra Map', 'No-Objection Certificate (NOC) from Co-owners']
    }
  ];

  // Try to find a match in the mock database
  const match = mockDatabase.find(entry => {
    const khasraMatch = khasra && entry.khasra.toLowerCase() === khasra.toLowerCase();
    const khataMatch = khata && entry.khata.toLowerCase() === khata.toLowerCase();
    return khasraMatch || khataMatch;
  });

  if (match) {
    return response.status(200).json({
      recordFound: true,
      ownerNameMatch: match.ownerName,
      lastMutationDate: match.lastMutationDate,
      disputeFound: match.disputeFound,
      legalReviewRecommended: match.legalReviewRecommended,
      legalReviewReason: match.legalReviewReason,
      missingDocuments: match.missingDocuments,
      inputDetails: { khasra, khata, village, tehsil },
      source: 'UP Bhulekh Land Records (Mocked Verification Portal)',
      verifiedAt: new Date().toISOString()
    });
  } else {
    // Generate a structured default dynamic fallback for unrecognized numbers
    const cleanKhasra = khasra || 'Unknown';
    const cleanKhata = khata || 'Unknown';
    const isOdd = parseInt(cleanKhasra) % 2 === 1 || cleanKhasra.length % 2 === 1;

    return response.status(200).json({
      recordFound: true,
      ownerNameMatch: isOdd ? 'Amit Kumar Dwivedi' : 'Prayagraj Land Development Board (Acquired)',
      lastMutationDate: isOdd ? '2023-01-15' : '1998-11-20',
      disputeFound: !isOdd,
      legalReviewRecommended: true,
      legalReviewReason: isOdd 
        ? 'Dynamic record match found. Last mutation date is recent. A professional registry review is required to verify there are no verbal partitions.'
        : 'Warning: This land plot might fall under development authority acquisitions (Prayagraj Smart City masterplan). Immediate legal review is critical.',
      missingDocuments: ['1359 Fasli Khatauni', 'Registered Sale Deed Draft', 'UP RERA Development Clearance Certificate'],
      inputDetails: { khasra, khata, village, tehsil },
      source: 'UP Bhulekh Land Records (Dynamic Mock Match)',
      verifiedAt: new Date().toISOString()
    });
  }
}

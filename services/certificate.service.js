const PDFDocument = require('pdfkit');

const certificateService = {
  generate(username, total, res) {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });

    const safeFilename = username.replace(/[^a-zA-Z0-9_\-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${safeFilename}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    const H = doc.page.height;

    doc.rect(20, 20, W - 40, H - 40).lineWidth(4).strokeColor('#D4AF37').stroke();
    doc.rect(30, 30, W - 60, H - 60).lineWidth(1).strokeColor('#D4AF37').stroke();

    doc.save()
      .rotate(-25, { origin: [W / 2, H / 2] })
      .fontSize(90).fillColor('#eeeeee')
      .text('FOR NOTHING', 60, H / 2 - 60, { align: 'center', width: W - 120 })
      .restore();

    doc.y = H / 2 - 110;
    doc.fillColor('#1a1a1a').fontSize(30).font('Helvetica-Bold')
      .text('Certificate of Pointless Contribution', { align: 'center' }).moveDown(0.8);

    doc.fontSize(16).font('Helvetica').text('This certifies that', { align: 'center' }).moveDown(0.3);
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#8B0000')
      .text(username, { align: 'center' }).moveDown(0.3);
    doc.fontSize(16).font('Helvetica').fillColor('#1a1a1a')
      .text(`has generously contributed $${total.toFixed(2)} to absolutely nothing.`, { align: 'center' })
      .moveDown(1.2);

    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.fontSize(12).fillColor('#666666')
      .text(`Witness: The Void    •    Date: ${dateStr}`, { align: 'center' });

    doc.end();
  }
};

module.exports = certificateService;

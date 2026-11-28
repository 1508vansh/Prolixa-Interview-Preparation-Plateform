const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
    const { selfDescription, jobDescription } = req.body

    const interViewReportByAi = await generateInterviewReport({
        resume: resumeContent.text,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeContent.text,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params
    let stage = "loading interview report"

    console.log(`[resume-pdf] Request started for report ${interviewReportId}`)

    try {
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        }).select("+resumePdf")

        if (!interviewReport) {
            console.log(`[resume-pdf] Report ${interviewReportId} was not found for the authenticated user`)
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        let pdfBuffer = interviewReport.resumePdf
        if (!pdfBuffer?.length) {
            const { resume, jobDescription, selfDescription } = interviewReport
            stage = "generating resume PDF"
            console.log(`[resume-pdf] No cached PDF for report ${interviewReportId}; generating it`)
            pdfBuffer = Buffer.from(await generateResumePdf({ resume, jobDescription, selfDescription }))

            stage = "saving generated PDF"
            interviewReport.resumePdf = pdfBuffer
            await interviewReport.save()
        } else {
            console.log(`[resume-pdf] Using cached PDF for report ${interviewReportId}`)
        }

        stage = "sending PDF response"
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (error) {
        console.error(`[resume-pdf] Failed while ${stage} for report ${interviewReportId}:`, error.stack || error.message)
        throw error
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }
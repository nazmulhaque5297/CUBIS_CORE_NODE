import request from "supertest";
import appFactory from "../../../../../app";

describe("tests document type APIs", () => {
  it("returns 200 status on successful request", async () => {
    await request(await appFactory())
      .get("/document-type")
      .send()
      .expect(200);
  });
  it("returns 201 status on successful document type created", async () => {
    const { body: document } = await request(await appFactory())
      .post("/document-type")
      .send({ name: "nid", isActive: "i" })
      .expect(201);

    expect(document.data).not.toEqual(null);
  });

  it("returns 200 on successful document type updated", async () => {
    const { body: document } = await request(await appFactory())
      .post("/document-type")
      .send({ name: "nid", isActive: "i" })
      .expect(201);

    const { body: updatedDocument } = await request(await appFactory())
      .put(`/document-type/${document.data.docTypeId}`)
      .send({ name: "nid", isActive: "a" })
      .expect(200);

    const { body: getDocument } = await request(await appFactory())
      .get(`/document-type?docTypeId=${updatedDocument.data.docTypeId}`)
      .send()
      .expect(200);

    expect(document.data.docTypeId).toEqual(updatedDocument.data.docTypeId);
    expect(getDocument.data[0].isActive).toEqual("a");
  });

  it("returns 200 on successful document type deleted", async () => {
    const { body: document } = await request(await appFactory())
      .post("/document-type")
      .send({ name: "nid", isActive: "i" })
      .expect(201);

    const { body: deletedDocument } = await request(await appFactory())
      .delete(`/document-type/${document.data.docTypeId}`)
      .send()
      .expect(200);

    expect(document.data.docTypeId).toEqual(deletedDocument.data.docTypeId);
  });
});

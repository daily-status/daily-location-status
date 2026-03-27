import { Router } from "express";
import { excelUpload } from "../../utils/middlewares";
import { LocationDal } from "./dal";
import * as handlers from "./handlers";
import { httpLogger } from "../../utils/decorators";

export const createLocationRouter = (dal: LocationDal) => {
  const router = Router();
  const decoratedHandlers = createDecoratedLocationHandlers(dal);

  router.get("/", decoratedHandlers.getAllLocationsHandler);
  router.get("/:id", decoratedHandlers.getLocationByIdHandler);
  router.post("/", decoratedHandlers.createLocationHandler);
  router.post("/excel", excelUpload.single("file"), decoratedHandlers.addLocationsFromExcelHandler);
  router.delete("/:id", decoratedHandlers.deleteLocationHandler);

  return router;
};

export const createDecoratedLocationHandlers = (dal: LocationDal) => ({
  getAllLocationsHandler: httpLogger(
    handlers.getAllLocationsHandler(dal),
    "getAllLocationsHandler"
  ),
  getLocationByIdHandler: httpLogger(
    handlers.getLocationByIdHandler(dal),
    "getLocationByIdHandler"
  ),
  createLocationHandler: httpLogger(
    handlers.createLocationHandler(dal),
    "createLocationHandler"
  ),
  addLocationsFromExcelHandler: httpLogger(
    handlers.addLocationsFromExcelHandler(dal),
    "addLocationsFromExcel"
  ),
  deleteLocationHandler: httpLogger(
    handlers.deleteLocationHandler(dal),
    "deleteLocationHandler"
  ),
});
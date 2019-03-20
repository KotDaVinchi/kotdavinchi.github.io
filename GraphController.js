class GraphController {
    constructor(updateFunctions) {

        this.updateFunctions = updateFunctions;
        this.drawPending = false
    }

    update(updatedIds) {
        if(!this.drawPending){
            this.drawPending = true;
            requestAnimationFrame((ms) => {
                this.drawPending = false;
                for(const i of updatedIds){
                    this.updateFunctions[i](ms);
                }
            });
        }else{
            console.log('IT IS NOT MEANINGLESS!!!!')
        }
    }

    animatedUpdate()
}